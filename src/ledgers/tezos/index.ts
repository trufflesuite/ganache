import Emittery from "emittery";
import { RequestType } from "../../types";
import Connector from "../../interfaces/connector";
import TezosProvider from "./provider";
import JsonRpc from "../../servers/utils/jsonrpc";
import ProviderOptions from "../../options/provider-options";
import TezosApi from "./api";




export default class TezosConnector    extends Emittery.Typed<{request: RequestType<TezosApi   >}, "ready" | "close">
  implements Connector<TezosApi> {
  provider: TezosProvider;
  #api: TezosApi;

  constructor(providerOptions: ProviderOptions) {
    super();

    const api = this.#api = new TezosApi();
    this.provider = new TezosProvider();
  }

  format(result: any) {
    return JSON.stringify(JsonRpc.Response("123", result));
  }

  parse = (message: Buffer) => {
    return JsonRpc.Request(JSON.parse(message as any))
  }

  handle = async (payload: any) => {
    const [result] = await this.emit("request", { api: this.#api, method: payload.method, params: payload.params });
    return result;
  }

  close() {
    return {} as any;
  }
}

