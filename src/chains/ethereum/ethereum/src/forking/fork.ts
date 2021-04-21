import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { Data, Quantity, utils } from "@ganache/utils";
import AbortController from "abort-controller";
import Common from "@ethereumjs/common";
import { HttpHandler } from "./handlers/http-handler";
import { WsHandler } from "./handlers/ws-handler";
import { Handler } from "./types";
import { Tag } from "@ganache/ethereum-utils";
import { Block } from "@ganache/ethereum-block";

const { KNOWN_CHAINIDS } = utils;

function fetchChainId(fork: Fork) {
  return fork.request<string>("eth_chainId", []);
}
function fetchNetworkId(fork: Fork) {
  return fork.request<string>("net_version", []);
}
function fetchBlockNumber(fork: Fork) {
  return fork.request<string>("eth_blockNumber", []);
}
function fetchBlock(fork: Fork, blockNumber: Quantity | Tag.LATEST) {
  return fork.request<any>("eth_getBlockByNumber", [blockNumber, true]);
}

export class Fork {
  public common: Common;
  #abortController = new AbortController();
  #handler: Handler;
  #options: EthereumInternalOptions["fork"];

  public blockNumber: Quantity;
  public stateRoot: Data;
  public block: Block;

  constructor(options: EthereumInternalOptions) {
    const forkingOptions = (this.#options = options.fork);

    const { protocol } = forkingOptions.url;

    switch (protocol) {
      case "ws:":
      case "wss:":
        this.#handler = new WsHandler(options, this.#abortController.signal);
        break;
      case "http:":
      case "https:":
        this.#handler = new HttpHandler(options, this.#abortController.signal);
        break;
      default: {
        throw new Error(`Unsupported protocol: ${protocol}`);
      }
    }
  }

  #setCommonFromChain = async () => {
    const [chainIdHex, networkIdStr] = await Promise.all([
      fetchChainId(this),
      fetchNetworkId(this)
    ]);

    const chainId = parseInt(chainIdHex);
    const networkId = parseInt(networkIdStr);
    this.common = Common.forCustomChain(
      KNOWN_CHAINIDS.has(chainId) ? chainId : 1,
      {
        name: "ganache-fork",
        networkId,
        chainId,
        comment: "Local test network fork"
      }
    );
  };

  #setBlockDataFromChainAndOptions = async () => {
    const options = this.#options;
    if (typeof options.blockNumber === "number") {
      const blockNumber = Quantity.from(options.blockNumber);
      const fetchBlockProm = fetchBlock(this, blockNumber).then(block => {
        this.stateRoot = block.stateRoot;
        return block;
      });
      await Promise.all([
        fetchBlockProm,
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
      return fetchBlockProm;
    } else {
      // if our block number option is "latest" override it with the original
      // chain's current blockNumber
      if (options.blockNumber === Tag.LATEST) {
        const block = await fetchBlock(this, Tag.LATEST);
        options.blockNumber = parseInt(block.number, 16);
        this.blockNumber = Quantity.from(options.blockNumber);
        this.stateRoot = Data.from(block.stateRoot);
        // if our block number option is _after_ the current block number throw,
        // as it likely wasn't intentional and doesn't make sense.
        return block;
      } else {
        throw new Error(
          `Invalid value for \`fork.blockNumber\` option: "${options.blockNumber}". Must be a positive integer or the string "latest".`
        );
      }
    }
  };

  public async initialize() {
    const [block] = await Promise.all([
      this.#setBlockDataFromChainAndOptions(),
      this.#setCommonFromChain()
    ]);
    this.block = new Block(Block.rawFromJSON(block), this.common);
  }

  public request<T = unknown>(method: string, params: unknown[]): Promise<T> {
    return this.#handler.request<T>(method, params);
  }

  public abort() {
    return this.#abortController.abort();
  }
}
