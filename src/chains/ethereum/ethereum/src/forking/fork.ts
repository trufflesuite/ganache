import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { Data, Quantity, KNOWN_CHAINIDS } from "@ganache/utils";
import AbortController from "abort-controller";
import Common from "@ethereumjs/common";
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
function fetchBlock(fork: Fork, blockNumber: Quantity | Tag.LATEST) {
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
  #options: EthereumInternalOptions["fork"];
  #accounts: Account[];
  #hardfork: string;

  public blockNumber: Quantity;
  public stateRoot: Data;
  public block: Block;

  constructor(options: EthereumInternalOptions, accounts: Account[]) {
    const forkingOptions = (this.#options = options.fork);
    this.#hardfork = options.chain.hardfork;
    this.#accounts = accounts;

    const { url } = forkingOptions;
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
    }
  }

  #setCommonFromChain = async (chainIdPromise: Promise<number>) => {
    const [chainId, networkId] = await Promise.all([
      chainIdPromise,
      fetchNetworkId(this)
    ]);

    this.common = Common.forCustomChain(
      KNOWN_CHAINIDS.has(chainId) ? chainId : 1,
      {
        name: "ganache-fork",
        defaultHardfork: this.#hardfork,
        networkId,
        chainId,
        comment: "Local test network fork"
      }
    );
    (this.common as any).on = () => {};
  };

  #setBlockDataFromChainAndOptions = async (
    chainIdPromise: Promise<number>
  ) => {
    const options = this.#options;
    if (options.blockNumber === Tag.LATEST) {
      const [latestBlock, chainId] = await Promise.all([
        fetchBlock(this, Tag.LATEST),
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
    } else if (typeof options.blockNumber === "number") {
      const blockNumber = Quantity.from(options.blockNumber);
      const [block] = await Promise.all([
        fetchBlock(this, blockNumber).then(async block => {
          this.stateRoot = block.stateRoot;
          await this.#syncAccounts(blockNumber);
          return block;
        }),
        fetchBlockNumber(this).then((latestBlockNumberHex: string) => {
          const latestBlockNumberInt = parseInt(latestBlockNumberHex, 16);
          // if our block number option is _after_ the current block number
          // throw, as it likely wasn't intentional and doesn't make sense.
          if (options.blockNumber > latestBlockNumberInt) {
            throw new Error(
              `\`fork.blockNumber\` (${options.blockNumber}) must not be greater than the current block number (${latestBlockNumberInt})`
            );
          } else {
            this.blockNumber = blockNumber;
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
    const options = this.#options;
    if (options.deleteCache) await PersistentCache.deleteDb();
    if (options.disableCache === false) {
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
    this.block = new Block(
      BlockManager.rawFromJSON(block, this.common),
      this.common
    );
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
}
