import Emittery from "emittery";
import {utils, types} from "@ganache/utils";
import Provider from "./provider";
import {ProviderOptions} from "@ganache/options";
import TezosApi from "./api";
import { HttpRequest } from "uWebSockets.js";

export type TezosProvider = Provider;
export const TezosProvider = Provider;

export class TezosConnector extends Emittery.Typed<undefined, "ready" | "close">
  implements types.Connector<TezosApi> {
  provider: Provider;
  #api: TezosApi;

  constructor(providerOptions: ProviderOptions, requestCoordinator: utils.Executor) {
    super();

    const api = (this.#api = new TezosApi());
    this.provider = new Provider(providerOptions);
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

