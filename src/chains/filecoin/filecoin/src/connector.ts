import Emittery from "emittery";
import FilecoinApi from "./api";
import {
  Executor,
  Connector as IConnector,
  JsonRpcRequest,
  JsonRpcResponse,
  makeResponse,
  makeError,
  KnownKeys
} from "@ganache/utils";
import FilecoinProvider from "./provider";
import {
  RecognizedString,
  HttpRequest,
  WebSocket
} from "@trufflesuite/uws-js-unofficial";
// SubscriptionMethod is a required import for Api Extractor.
import type { SubscriptionMethod } from "./types/subscriptions";
import { FilecoinProviderOptions } from "@ganache/filecoin-options";
export { StorageDealStatus } from "./types/storage-deal-status";

export type Provider = FilecoinProvider;
export const Provider = FilecoinProvider;

export class Connector<
    R extends JsonRpcRequest<
      FilecoinApi,
      KnownKeys<FilecoinApi>
    > = JsonRpcRequest<FilecoinApi, KnownKeys<FilecoinApi>>
  >
  extends Emittery.Typed<{}, "ready" | "close">
  implements IConnector<FilecoinApi, R, JsonRpcResponse> {
  #provider: FilecoinProvider;

  get provider() {
    return this.#provider;
  }

  constructor(
    providerOptions: FilecoinProviderOptions = {},
    executor: Executor
  ) {
    super();

    this.#provider = new FilecoinProvider(providerOptions, executor);
  }

  async connect() {
    await this.#provider.initialize();
    // no need to wait for #provider.once("connect") as the initialize()
    // promise has already accounted for that after the promise is resolved
    await this.emit("ready");
  }

  parse(message: Buffer) {
    return JSON.parse(message) as R;
  }

  handle(payload: R, _connection: HttpRequest | WebSocket): Promise<any> {
    return this.#provider._requestRaw(payload);
  }

  format(result: any, payload: R): RecognizedString {
    const json = makeResponse(payload.id, result);
    return JSON.stringify(json);
  }

  formatError(error: Error & { code: number }, payload: R): RecognizedString {
    const json = makeError(
      payload && payload.id ? payload.id : undefined,
      error
    );
    return JSON.stringify(json);
  }

  async close() {
    return await this.#provider.stop();
  }
}
