import Emittery from "emittery";
import { utils, types } from "@ganache/utils";
import Provider from "./src/provider";
import TezosApi from "./src/api";
import { HttpRequest } from "uWebSockets.js";

export type TezosProvider = Provider;
export const TezosProvider = Provider;

export class TezosConnector
  extends Emittery.Typed<undefined, "ready" | "close">
  implements types.Connector<TezosApi, unknown, unknown> {
  provider: Provider;
  #api: TezosApi;

  constructor(providerOptions: any, requestCoordinator: utils.Executor) {
    super();

    const api = (this.#api = new TezosApi());
    this.provider = new Provider(providerOptions);
  }

  format(result: any) {
    return JSON.stringify(result);
  }

  formatError(error: any) {
    return JSON.stringify(error);
  }

  parse(message: Buffer) {
    return JSON.parse(message);
  }

  handle(payload: any, _connection: HttpRequest): Promise<any> {
    return Promise.resolve(123);
  }

  close() {
    return {};
  }
}
