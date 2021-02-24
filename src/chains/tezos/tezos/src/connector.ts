import Emittery from "emittery";
import TezosApi from "./api";
import { JsonRpcTypes, types, utils } from "@ganache/utils";
import TezosProvider from "./provider";
import { RecognizedString, WebSocket, HttpRequest } from "uWebSockets.js";
import { CodedError, ErrorCodes } from "@ganache/tezos-utils";
import { TezosProviderOptions } from "@ganache/tezos-options";

export type ProviderOptions = TezosProviderOptions;
export type Provider = TezosProvider;
export const Provider = TezosProvider;

function isHttp(
  connection: HttpRequest | WebSocket
): connection is HttpRequest {
  return connection.constructor.name === "uWS.HttpRequest";
}

export class Connector
  extends Emittery.Typed<undefined, "ready" | "close">
  implements
    types.Connector<
      TezosApi,
      JsonRpcTypes.Request<TezosApi> | JsonRpcTypes.Request<TezosApi>[],
      JsonRpcTypes.Response
    > {
  #provider: TezosProvider;

  get provider() {
    return this.#provider;
  }

  constructor(
    providerOptions: ProviderOptions = null,
    executor: utils.Executor
  ) {
    super();

    const provider = (this.#provider = new TezosProvider(
      providerOptions,
      executor
    ));
    provider.on("connect", () => {
      // tell the consumer (like a `ganache-core` server/connector) everything is ready
      this.emit("ready");
    });
  }

  parse(message: Buffer) {
    try {
      return JSON.parse(message) as JsonRpcTypes.Request<TezosApi>;
    } catch (e) {
      throw new CodedError(e.message, ErrorCodes.PARSE_ERROR);
    }
  }

  handle(
    payload: JsonRpcTypes.Request<TezosApi> | JsonRpcTypes.Request<TezosApi>[],
    connection: HttpRequest | WebSocket
  ) {
    if (Array.isArray(payload)) {
      // handle batch transactions
      const promises = payload.map(payload =>
        this.#handle(payload, connection)
          .then(({ value }) => value)
          .catch(e => e)
      );
      return Promise.resolve({ value: Promise.all(promises) });
    } else {
      return this.#handle(payload, connection);
    }
  }
  #handle = (
    payload: JsonRpcTypes.Request<TezosApi>,
    connection: HttpRequest | WebSocket
  ) => {
    const method = payload.method;
    // TODO: Add tezos specific error codes
    const params = payload.params as Parameters<TezosApi[typeof method]>;
    return this.#provider._requestRaw({ method, params });
  };

  format(
    result: any,
    payload: JsonRpcTypes.Request<TezosApi>
  ): RecognizedString;
  format(
    results: any[],
    payloads: JsonRpcTypes.Request<TezosApi>[]
  ): RecognizedString;
  format(
    results: any | any[],
    payload: JsonRpcTypes.Request<TezosApi> | JsonRpcTypes.Request<TezosApi>[]
  ): RecognizedString {
    if (Array.isArray(payload)) {
      return JSON.stringify(
        payload.map((payload, i) => {
          const result = results[i];
          if (result instanceof Error) {
            return JsonRpcTypes.Error(payload.id, result as any);
          } else {
            return JsonRpcTypes.Response(payload.id, result);
          }
        })
      );
    } else {
      const json = JsonRpcTypes.Response(payload.id, results);
      return JSON.stringify(json);
    }
  }

  formatError(
    error: Error & { code: number },
    payload: JsonRpcTypes.Request<TezosApi>
  ): RecognizedString {
    const json = JsonRpcTypes.Error(
      payload && payload.id ? payload.id : null,
      error
    );
    return JSON.stringify(json);
  }

  close() {
    return this.#provider.disconnect();
  }
}
