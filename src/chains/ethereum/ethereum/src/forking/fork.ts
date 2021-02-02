import { EthereumInternalOptions } from "@ganache/ethereum-options";
import AbortController from "abort-controller";
import { HttpHandler } from "./handlers/http-handler";
import { WsHandler } from "./handlers/ws-handler";
import { Handler } from "./types";
export class Fork {
  private abortController = new AbortController();
  private handler: Handler;

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
        return;
      default: {
        throw new Error(`Unsupported protocol: ${url.protocol}`);
      }
    }
  }

  public request(method: string, params: unknown[]) {
    return this.handler.request(method, params);
  }

  public abort() {
    return this.abortController.abort();
  }
}
