import {ProviderOptions} from "@ganache/options";
import Emittery from "emittery";
import EthereumApi from "./api";
import {JsonRpcTypes, types, utils} from "@ganache/utils";
import Provider from "./provider";
import {RecognizedString, WebSocket, HttpRequest} from "uWebSockets.js";
import { PromiEvent } from "@ganache/utils";

function isHttp(connection: HttpRequest | WebSocket): connection is HttpRequest {
  return connection.constructor.name === "uWS.HttpRequest"
}

export type EthereumProvider = Provider;
export const EthereumProvider = Provider;

export class EthereumConnector extends Emittery.Typed<undefined, "ready" | "close">
  implements types.Connector<EthereumApi, JsonRpcTypes.Request<EthereumApi>, JsonRpcTypes.Response> {

  #provider: Provider;
  
  get provider() {
    return this.#provider;
  }

  constructor(providerOptions: ProviderOptions = null, executor: utils.Executor) {
    super();

    const provider = this.#provider = new EthereumProvider(providerOptions, executor);
    provider.on("connect", () => {
      // tell the consumer (like a `ganache-core` server/connector) everything is ready
      this.emit("ready");
    });
  }

  parse(message: Buffer) {
    return JSON.parse(message) as JsonRpcTypes.Request<EthereumApi>;
  }

  handle(payload: JsonRpcTypes.Request<EthereumApi>, connection: HttpRequest | WebSocket) {
    const method = payload.method;
    if (method === "eth_subscribe") {
      if (isHttp(connection)) {
        const err = new Error("notifications not supported") as Error & {code: number};
        const error = JsonRpcTypes.Error(payload.id, err);
        // return Promise.reject(error);
      }
    }
    const params = payload.params as Parameters<EthereumApi[typeof method]>;
    return this.#provider.requestRaw({method, params});
  }

  format(result: any, payload: JsonRpcTypes.Request<EthereumApi>): RecognizedString {
    const json = JsonRpcTypes.Response(payload.id, result);
    return JSON.stringify(json);
  }

  formatError(error: Error & {code: number}, payload: JsonRpcTypes.Request<EthereumApi>): RecognizedString {
    const json = JsonRpcTypes.Error(payload.id, error);
    return JSON.stringify(json);
  }


  close(){
    return this.#provider.disconnect();
  }
}
