import ProviderOptions, {getDefault as getDefaultProviderOptions} from "../../core/src/options/provider-options";
import Emittery from "emittery";
import EthereumApi from "./api";
import JsonRpc from "../../core/src/servers/utils/jsonrpc";
import Connector from "../../core/src/interfaces/connector";
import {RequestType} from "../../core/src/types";
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

  handle(payload: JsonRpc.Request<EthereumApi>): Promise<any> {
    return this.#provider.request(payload.method, payload.params);
  }

  format(result: any, payload: JsonRpc.Request<EthereumApi>): RecognizedString {
    const json = JsonRpc.Response(payload.id, result);
    return JSON.stringify(json);
  }
}
