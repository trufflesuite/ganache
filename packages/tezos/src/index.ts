import Emittery from "emittery";
import {RequestType} from "@ganache/core/src/types";
import Connector from "@ganache/core/src/interfaces/connector";
import TezosProvider from "./provider";
import JsonRpc from "@ganache/core/src/servers/utils/jsonrpc";
import ProviderOptions from "@ganache/core/src/options/provider-options";
import TezosApi from "./api";
import { HttpRequest } from "uWebSockets.js";

export default class TezosConnector extends Emittery.Typed<undefined, "ready" | "close">
  implements Connector<TezosApi> {
  provider: TezosProvider;
  #api: TezosApi;

  constructor(providerOptions: ProviderOptions, requestCoordinator: any) {
    super();

    const api = (this.#api = new TezosApi());
    this.provider = new TezosProvider(providerOptions);
  }

  format(result: any) {
    return JSON.stringify(JsonRpc.Response("123", result));
  }

  parse(message: Buffer){
    return JsonRpc.Request(JSON.parse(message as any));
  };

  handle (payload: any, _connection: HttpRequest): Promise<any> {
    
      return Promise.resolve(123);
    
  };

  close() {
    return {} as any;
  }
}

