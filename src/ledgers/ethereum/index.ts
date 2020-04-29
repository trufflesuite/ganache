import ProviderOptions, {getDefault as getDefaultProviderOptions} from "../../options/provider-options";
import Emittery from "emittery";
import EthereumApi from "./api";
import JsonRpc from "../../servers/utils/jsonrpc";
import Connector from "../../interfaces/connector";
import { RequestType } from "../../types";
import EthereumProvider from "./provider";
import { RecognizedString } from "uWebSockets.js";

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

  parse = (message: Buffer) => {
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
