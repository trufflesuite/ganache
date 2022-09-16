import FilecoinApi from "./api";
import {
  Executor,
  Connector as IConnector,
  RecognizedString,
  HttpRequest,
  WebSocket
} from "@ganache/flavor";
import {
  JsonRpcRequest,
  JsonRpcResponse,
  makeResponse,
  makeError,
  KnownKeys
} from "@ganache/utils";
import { FilecoinProviderOptions } from "@ganache/filecoin-options";
import { FilecoinProvider } from "./provider";
export { FilecoinProvider } from "./provider";
export { StorageDealStatus } from "./types/storage-deal-status";

/**
 * @internal
 */
export class Connector<
  R extends JsonRpcRequest<
    FilecoinApi,
    KnownKeys<FilecoinApi>
  > = JsonRpcRequest<FilecoinApi, KnownKeys<FilecoinApi>>
> implements IConnector<FilecoinProvider, R, JsonRpcResponse>
{
  #provider: FilecoinProvider;

  get provider(): FilecoinProvider {
    return this.#provider;
  }

  constructor(
    providerOptions: FilecoinProviderOptions | null = {},
    executor: Executor
  ) {
    this.#provider = new FilecoinProvider(providerOptions, executor);
  }

  async connect() {
    await this.#provider.initialize();
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
