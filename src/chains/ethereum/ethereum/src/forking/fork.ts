import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { utils } from "@ganache/utils";
import AbortController from "abort-controller";
import Common from "@ethereumjs/common";
import { HttpHandler } from "./handlers/http-handler";
import { WsHandler } from "./handlers/ws-handler";
import { Handler } from "./types";

const { KNOWN_CHAINIDS } = utils;

function fetchChainId(fork: Fork) {
  return fork.request<string>("eth_chainId", []);
}
function fetchNetworkId(fork: Fork) {
  return fork.request<string>("net_version", []);
}

export class Fork {
  private abortController = new AbortController();
  private handler: Handler;
  private _common: Common;
  private _commonProm: Promise<[string, string, Error?]>;

  constructor(options: EthereumInternalOptions) {
    const forkingOptions = options.fork;
    const { url } = forkingOptions;

    switch (url.protocol) {
      case "ws:":
      case "wss:":
        this.handler = new WsHandler(options, this.abortController.signal);
        break;
      case "http:":
      case "https:":
        this.handler = new HttpHandler(options, this.abortController.signal);
        break;
      default: {
        throw new Error(`Unsupported protocol: ${url.protocol}`);
      }
    }
    this.initialize();
  }

  public initialize() {
    this._commonProm = Promise.all([
      fetchChainId(this),
      fetchNetworkId(this)
    ]).catch(e => [, , e]);
  }

  public async getCommon() {
    if (this._common) return this._common;
    const [chainIdHex, networkIdStr, error] = await this._commonProm;
    if (error) {
      throw error;
    }
    this._commonProm = null;
    const chainId = parseInt(chainIdHex);
    const networkId = parseInt(networkIdStr);
    this._common = Common.forCustomChain(
      KNOWN_CHAINIDS.has(chainId) ? chainId : 1,
      {
        name: "ganache-fork",
        networkId,
        chainId,
        comment: "Local test network fork"
      }
    );
    return this._common;
  }

  public request<T = unknown>(method: string, params: unknown[]): Promise<T> {
    return this.handler.request(method, params) as Promise<T>;
  }

  public abort() {
    return this.abortController.abort();
  }
}
