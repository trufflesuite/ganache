import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { Data, Quantity, KNOWN_CHAINIDS } from "@ganache/utils";
import { Common } from "@ethereumjs/common";
import { HttpHandler } from "./handlers/http-handler";
import { WsHandler } from "./handlers/ws-handler";
import { Handler } from "./types";
import { Tag } from "@ganache/ethereum-utils";
import { Block } from "@ganache/ethereum-block";
import { Address } from "@ganache/ethereum-address";
import { Account } from "@ganache/ethereum-utils";
import BlockManager from "../data-managers/block-manager";
import { ProviderHandler } from "./handlers/provider-handler";
import { PersistentCache } from "./persistent-cache/persistent-cache";
import { URL } from "url";
import { removeEIP3860InitCodeSizeLimitCheck } from "../helpers/common-helpers";

async function fetchChainId(fork: Fork) {
  const chainIdHex = await fork.request<string>("eth_chainId", []);
  return parseInt(chainIdHex, 16);
}
async function fetchNetworkId(fork: Fork) {
  const networkIdStr = await fork.request<string>("net_version", []);
  return parseInt(networkIdStr, 10);
}
function fetchBlockNumber(fork: Fork) {
  // {disableCache: true} required so we never cache the blockNumber, as forking
  // shouldn't ever cache a method that can change!
  return fork.request<string>("eth_blockNumber", [], { disableCache: true });
}
function fetchBlock(fork: Fork, blockNumber: Quantity | typeof Tag.latest) {
  return fork.request<any>("eth_getBlockByNumber", [blockNumber, true]);
}
async function fetchNonce(fork: Fork, address: Address, blockNumber: Quantity) {
  const nonce = await fork.request<string>("eth_getTransactionCount", [
    address,
    blockNumber
  ]);
  return Quantity.from(nonce);
}

export class Fork {
  public common: Common;
  #abortController = new AbortController();
  #handler: Handler;
  #options: EthereumInternalOptions;
  #accounts: Account[];
  #hardfork: string;

  public blockNumber: Quantity;
  public stateRoot: Data;
  public block: Block;
  public chainId: number;

  constructor(options: EthereumInternalOptions, accounts: Account[]) {
    this.#options = options;
    const forkingOptions = options.fork;
    this.#hardfork = options.chain.hardfork;
    this.#accounts = accounts;

    const { url, network } = forkingOptions;
    if (url) {
      const { protocol } = url;

      switch (protocol) {
        case "ws:":
        case "wss:":
          this.#handler = new WsHandler(options, this.#abortController.signal);
          break;
        case "http:":
        case "https:":
          this.#handler = new HttpHandler(
            options,
            this.#abortController.signal
          );
          break;
        default: {
          throw new Error(`Unsupported protocol: ${protocol}`);
        }
      }
    } else if (forkingOptions.provider) {
      this.#handler = new ProviderHandler(
        options,
        this.#abortController.signal
      );
    } else if (network) {
      let normalizedNetwork: string;
      if (network === "görli") {
        forkingOptions.network = normalizedNetwork = "goerli";
      } else {
        normalizedNetwork = network;
      }
      // Note: `process.env.INFURA_KEY` is replaced by webpack with an infura
      // key.
      const infuraKey = process.env.INFURA_KEY;
      if (!infuraKey) {
        throw new Error(
          "The INFURA_KEY environment variable was not given and is required when using Ganache's integrated archive network feature."
        );
      }
      // any because the `network` check above narrowed the type to one
      // that doesn't include `url`, but we still want to add it.
      (forkingOptions as any).url = new URL(
        `wss://${normalizedNetwork}.infura.io/ws/v3/${infuraKey}`
      );
      this.#handler = new WsHandler(options, this.#abortController.signal);
    }
  }

  #setCommonFromChain = async (chainIdPromise: Promise<number>) => {
    const [chainId, networkId] = await Promise.all([
      chainIdPromise,
      fetchNetworkId(this)
    ]);

    this.chainId = chainId;

    this.common = Common.custom(
      {
        name: "ganache-fork",
        defaultHardfork: this.#hardfork,
        // use the remote chain's network id mostly because truffle's debugger
        // needs it to match in order to fetch sources
        networkId,
        // we use ganache's own chain id for blocks _after_ the fork to prevent
        // replay attacks
        chainId: this.#options.chain.chainId,
        comment: "Local test network fork"
      },
      { baseChain: KNOWN_CHAINIDS.has(chainId) ? chainId : 1 }
    );
    if (this.#options.chain.allowUnlimitedInitCodeSize) {
      removeEIP3860InitCodeSizeLimitCheck(this.common);
    }
    // disable listeners to common since we don't actually cause any `emit`s,
    // but other EVM parts to listen and will make node complain about too
    // many listeners.
    (this.common as any).on = () => {};
  };

  #setBlockDataFromChainAndOptions = async (
    chainIdPromise: Promise<number>
  ) => {
    const { fork: options } = this.#options;
    const blockNumber = options.blockNumber;
    if (blockNumber === Tag.latest) {
      const [latestBlock, chainId] = await Promise.all([
        fetchBlock(this, Tag.latest),
        chainIdPromise
      ]);
      let blockNumber = parseInt(latestBlock.number, 16);
      const effectiveBlockNumber = KNOWN_CHAINIDS.has(chainId)
        ? Math.max(blockNumber - options.preLatestConfirmations, 0)
        : blockNumber;
      let block;
      if (effectiveBlockNumber !== blockNumber) {
        block = await fetchBlock(this, Quantity.from(effectiveBlockNumber));
      } else {
        block = latestBlock;
      }
      options.blockNumber = effectiveBlockNumber;
      this.blockNumber = Quantity.from(effectiveBlockNumber);
      this.stateRoot = Data.from(block.stateRoot);
      await this.#syncAccounts(this.blockNumber);
      return block;
    } else if (blockNumber >= 0) {
      const qBlockNumber = Quantity.from(blockNumber);
      const [block] = await Promise.all([
        fetchBlock(this, qBlockNumber).then(async block => {
          this.stateRoot = block.stateRoot;
          await this.#syncAccounts(qBlockNumber);
          return block;
        }),
        fetchBlockNumber(this).then((latestBlockNumberHex: string) => {
          const latestBlockNumberInt = parseInt(latestBlockNumberHex, 16);
          // if our block number option is _after_ the current block number
          // throw, as it likely wasn't intentional and doesn't make sense.
          if (blockNumber > latestBlockNumberInt) {
            throw new Error(
              `\`fork.blockNumber\` (${options.blockNumber}) must not be greater than the current block number (${latestBlockNumberInt})`
            );
          } else {
            this.blockNumber = qBlockNumber;
          }
        })
      ]);
      return block;
    } else {
      throw new Error(
        `Invalid value for \`fork.blockNumber\` option: "${options.blockNumber}". Must be a positive integer or the string "latest".`
      );
    }
  };

  #syncAccounts = (blockNumber: Quantity) => {
    return Promise.all(
      this.#accounts.map(async account => {
        const nonce = await fetchNonce(this, account.address, blockNumber);
        account.nonce = nonce;
      })
    );
  };

  public async initialize() {
    let cacheProm: Promise<PersistentCache>;
    const {
      fork: forkOptions,
      chain: chainOptions,
      miner: minerOptions
    } = this.#options;
    if (forkOptions.deleteCache) await PersistentCache.deleteDb();
    if (forkOptions.disableCache === false) {
      // ignore cache start up errors as it is possible there is an `open`
      // conflict if another ganache fork is running at the time this one is
      // started. The cache isn't required (though performance will be
      // degraded without it)
      cacheProm = PersistentCache.create().catch(_e => null);
    } else {
      cacheProm = null;
    }
    const chainIdPromise = fetchChainId(this);
    const [block, cache] = await Promise.all([
      this.#setBlockDataFromChainAndOptions(chainIdPromise),
      cacheProm,
      this.#setCommonFromChain(chainIdPromise)
    ]);

    const common = this.getCommonForBlock(this.common, {
      timestamp: BigInt(block.timestamp),
      number: BigInt(block.number)
    });
    this.block = new Block(BlockManager.rawFromJSON(block, common), common);
    if (!chainOptions.time && minerOptions.timestampIncrement !== "clock") {
      chainOptions.time = new Date(
        (this.block.header.timestamp.toNumber() +
          minerOptions.timestampIncrement.toNumber()) *
          1000
      );
    }

    if (cache) await this.initCache(cache);
  }
  private async initCache(cache: PersistentCache) {
    await cache.initialize(
      this.block.header.number,
      this.block.hash(),
      this.request.bind(this)
    );
    this.#handler.setCache(cache);
  }

  public request<T = unknown>(
    method: string,
    params: unknown[],
    options = { disableCache: false }
  ): Promise<T> {
    return this.#handler.request<T>(method, params, options);
  }

  public abort() {
    return this.#abortController.abort();
  }

  public close() {
    return this.#handler.close();
  }

  public isValidForkBlockNumber(blockNumber: Quantity) {
    return blockNumber.toBigInt() <= this.blockNumber.toBigInt();
  }

  public selectValidForkBlockNumber(blockNumber: Quantity) {
    return this.isValidForkBlockNumber(blockNumber)
      ? blockNumber
      : this.blockNumber;
  }

  /**
   * If the `blockNumber` is before our `fork.blockNumber`, return a `Common`
   * instance, applying the rules from the remote chain's `common` via its
   * original `chainId` (hardforks are applied if they are scheduled on the
   * given chain on or after the blocknumber or timestamp of the given `block`).
   * If the remote chain's `chainId` is not "known", return a `Common` with our
   * local `common`'s rules applied, but with the remote chain's `chainId`. If
   * the block is greater than or equal to our `fork.blockNumber` return
   * `common`.
   * @param common -
   * @param blockNumber -
   */
  public getCommonForBlock(
    common: Common,
    block: { number: bigint; timestamp: bigint }
  ): Common {
    if (block.number <= this.blockNumber.toBigInt()) {
      // we are at or before our fork block

      let forkCommon: Common;
      if (KNOWN_CHAINIDS.has(this.chainId)) {
        // we support this chain id, so let's use its rules
        let hardfork;
        // hardforks are iterated from earliest to latest
        for (const hf of common.hardforks()) {
          if (hf.timestamp) {
            const hfTimestamp = BigInt(hf.timestamp);
            if (block.timestamp >= hfTimestamp) {
              hardfork = hf.name;
            } else {
              break;
            }
          } else if (hf.block) {
            if (block.number >= BigInt(hf.block)) {
              hardfork = hf.name;
            } else {
              break;
            }
          }
        }

        forkCommon = new Common({ chain: this.chainId, hardfork });
      } else {
        // we don't know about this chain or hardfork, so just carry on per usual,
        // but with the fork's chainId (instead of our local chainId)
        forkCommon = Common.custom(
          {
            chainId: this.chainId,
            defaultHardfork: common.hardfork()
          },
          { baseChain: 1 }
        );
      }
      if (this.#options.chain.allowUnlimitedInitCodeSize) {
        removeEIP3860InitCodeSizeLimitCheck(forkCommon);
      }
      return forkCommon;
    } else {
      return common;
    }
  }
}
