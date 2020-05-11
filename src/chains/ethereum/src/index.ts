import ProviderOptions, {getDefault as getDefaultProviderOptions} from "@ganache/flavors/src/provider-options";
import Emittery from "emittery";
import EthereumApi from "./api";
import JsonRpc from "@ganache/utils/src/things/jsonrpc";
import Connector from "@ganache/utils/src/interfaces/connector";
import EthereumProvider from "./provider";
import {RecognizedString, WebSocket, HttpRequest} from "uWebSockets.js";
import PromiEvent from "@ganache/utils/src/things/promievent";

function isHttp(connection: HttpRequest | WebSocket): connection is HttpRequest {
  return connection.constructor.name === "uWS.HttpRequest"
}

export default class EthereumConnector extends Emittery.Typed<undefined, "ready" | "close">
  implements Connector<EthereumApi, JsonRpc.Request<EthereumApi>> {

  #provider: EthereumProvider;
  
  get provider() {
    return this.#provider;
  }

  constructor(providerOptions: ProviderOptions = null, executor: any) {
    super();

    const provider = this.#provider = new EthereumProvider(providerOptions, executor);
    provider.on("connect", () => {
      // tell the consumer (like a `ganache-core` server) everything is ready
      this.emit("ready");
    });
  }

  parse(message: Buffer) {
    return JSON.parse(message as any) as JsonRpc.Request<EthereumApi>;
  }

  handle(payload: JsonRpc.Request<EthereumApi>, connection: HttpRequest | WebSocket): PromiEvent<any> {
    const method = payload.method;
    if (method === "eth_subscribe") {
      if (isHttp(connection)) {
        const error = JsonRpc.Error(payload.id, "-32000", "notifications not supported");
        return new PromiEvent((_, reject) => void reject(error));
      } else {
        return this.#provider.request("eth_subscribe", payload.params as Parameters<EthereumApi["eth_subscribe"]>);
      }
    }
    return new PromiEvent((resolve) => {
      this.#provider.request(method, payload.params as Parameters<EthereumApi[typeof method]>).then(resolve);
    });
  }

  format(result: any, payload: JsonRpc.Request<EthereumApi>): RecognizedString {
    const json = JsonRpc.Response(payload.id, result);
    return JSON.stringify(json);
  }

  close(){
    return this.#provider.disconnect();
  }
}
