import Emittery from "emittery";
import { Connector, Executor } from "@ganache/utils";
import Provider from "./src/provider";
import TezosApi from "./src/api";
import { HttpRequest } from "@trufflesuite/uws-js-unofficial";

export type TezosProvider = Provider;
export const TezosProvider = Provider;

export class TezosConnector
  extends Emittery<{ ready: undefined; close: undefined }>
  implements Connector<TezosApi, unknown, unknown>
{
  provider: Provider;
  #api: TezosApi;

  constructor(providerOptions: any, requestCoordinator: Executor) {
    super();

    const api = (this.#api = new TezosApi());
    this.provider = new Provider(providerOptions);
  }

  async connect() {}

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
