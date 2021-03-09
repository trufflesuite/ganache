import Emittery from "emittery";
import FilecoinApi from "./api";
import { JsonRpcTypes, types, utils } from "@ganache/utils";
import FilecoinProvider from "./provider";
import {
  RecognizedString,
  HttpRequest,
  WebSocket
} from "@seesemichaelj/uwebsockets.js";
import { FilecoinProviderOptions } from "@ganache/filecoin-options";
export { StorageDealStatus } from "./types/storage-deal-status";

export type Provider = FilecoinProvider;
export const Provider = FilecoinProvider;

export class Connector
  extends Emittery.Typed<{}, "ready" | "close">
  implements
    types.Connector<
      FilecoinApi,
      JsonRpcTypes.Request<FilecoinApi>,
      JsonRpcTypes.Response
    > {
  #provider: FilecoinProvider;

  get provider() {
    return this.#provider;
  }

  constructor(
    providerOptions: FilecoinProviderOptions = {},
    executor: utils.Executor
  ) {
    super();

    const provider = (this.#provider = new FilecoinProvider(
      providerOptions,
      executor
    ));

    provider.on("ready", () => {
      // tell the consumer (like a `ganache-core` server/connector) everything is ready
      this.emit("ready");
    });
  }

  parse(message: Buffer) {
    return JSON.parse(message) as JsonRpcTypes.Request<FilecoinApi>;
  }

  handle(
    payload: JsonRpcTypes.Request<FilecoinApi>,
    _connection: HttpRequest | WebSocket
  ): Promise<any> {
    return this.#provider._requestRaw(payload);
  }

  format(
    result: any,
    payload: JsonRpcTypes.Request<FilecoinApi>
  ): RecognizedString {
    const json = JsonRpcTypes.Response(payload.id, result);
    return JSON.stringify(json);
  }

  formatError(
    error: Error & { code: number },
    payload: JsonRpcTypes.Request<FilecoinApi>
  ): RecognizedString {
    const json = JsonRpcTypes.Error(
      payload && payload.id ? payload.id : undefined,
      error
    );
    return JSON.stringify(json);
  }

  async close() {
    return await this.#provider.stop();
  }
}
