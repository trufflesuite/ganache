import Emittery from "emittery";
import {utils, types} from "@ganache/utils";
import TezosProvider from "./provider";
import TezosApi from "./api";
import { HttpRequest } from "uWebSockets.js";
import { TezosOptions } from "@ganache/options";

export default class TezosConnector extends Emittery.Typed<undefined, "ready" | "close">
  implements types.Connector<TezosApi> {
  provider: TezosProvider;
  #api: TezosApi;

  constructor(providerOptions: TezosOptions, requestCoordinator: utils.Executor) {
    super();

    const api = (this.#api = new TezosApi());
    this.provider = new TezosProvider(providerOptions);
  }

  format(result: any) {
    return JSON.stringify(result);
  }

  parse(message: Buffer) {
    return JSON.parse(message);
  };

  handle (payload: any, _connection: HttpRequest): Promise<any> {
    return Promise.resolve(123);
  };

  close() {
    return {} as any;
  }
}

