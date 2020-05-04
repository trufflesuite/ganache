import ProviderOptions, {getDefault as getDefaultProviderOptions} from "@ganache/core/src/options/provider-options";
import Emittery from "emittery";
import EthereumApi from "./api";
import JsonRpc from "@ganache/core/src/servers/utils/jsonrpc";
import Connector from "@ganache/core/src/interfaces/connector";
import {RequestType} from "@ganache/core/src/types";
import EthereumProvider from "./provider";
import {RecognizedString} from "uWebSockets.js";

export default class EthereumConnector extends Emittery.Typed<{request: RequestType<EthereumApi>}, "ready" | "close">
  implements Connector<EthereumApi, JsonRpc.Request<EthereumApi>> {
  #provider: EthereumProvider;
  get provider() {
    return this.#provider;
  }

  constructor(providerOptions?: ProviderOptions) {
    super();

    this.#provider = new EthereumProvider(providerOptions);
  }

  parse(message: Buffer) {
    return JSON.parse(message as any) as JsonRpc.Request<EthereumApi>;
  }

  handle(payload: JsonRpc.Request<EthereumApi>, protocol: "http" | "ws"): Promise<any> {
    const method = payload.method;
    if (protocol === "http" && method === "eth_subscribe" || method == "eth_unsubscribe") {
      const error = JsonRpc.Error(payload.id, "-32000", "notifications not supported");
      return Promise.reject(error);
    }
    return this.#provider.request(method, payload.params);
  }

  format(result: any, payload: JsonRpc.Request<EthereumApi>): RecognizedString {
    const json = JsonRpc.Response(payload.id, result);
    return JSON.stringify(json);
  }
}
