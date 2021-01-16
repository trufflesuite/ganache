import Emittery from "emittery";
import FilecoinApi from "./api";
import { JsonRpcTypes, types, utils, PromiEvent } from "@ganache/utils";
import FilecoinProvider from "./provider";
import { RecognizedString, HttpRequest } from "uWebSockets.js";
import { FilecoinProviderOptions } from "@ganache/filecoin-options";

export type ProviderOptions = FilecoinProviderOptions;
export type Provider = FilecoinProvider;
export const Provider = FilecoinProvider;
export const FlavorName = "filecoin" as const;

export class Connector
  extends Emittery.Typed<undefined, "ready" | "close">
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
    providerOptions: ProviderOptions = null,
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

  // Note that if we allow Filecoin to support Websockets, ws-server.ts blows up.
  // TODO: Look into this.
  handle(
    payload: JsonRpcTypes.Request<FilecoinApi>,
    _connection: HttpRequest /*| WebSocket*/
  ): PromiEvent<any> {
    return new PromiEvent(resolve => {
      return this.#provider.send(payload).then(resolve);
    });
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
      payload && payload.id ? payload.id : null,
      error
    );
    return JSON.stringify(json);
  }

  close() {
    return this.#provider.stop();
  }
}
