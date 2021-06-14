import Emittery from "emittery";
import EthereumApi from "./api";
import { JsonRpcTypes, types, utils } from "@ganache/utils";
import EthereumProvider from "./provider";
import {
  RecognizedString,
  WebSocket,
  HttpRequest,
  TemplatedApp
} from "uWebSockets.js";
import { CodedError, ErrorCodes } from "@ganache/ethereum-utils";
import {
  EthereumProviderOptions,
  EthereumLegacyOptions
} from "@ganache/ethereum-options";

export type ProviderOptions = EthereumProviderOptions | EthereumLegacyOptions;
export type Provider = EthereumProvider;
export const Provider = EthereumProvider;

function isHttp(
  connection: HttpRequest | WebSocket
): connection is HttpRequest {
  return connection.constructor.name === "uWS.HttpRequest";
}

export class Connector
  extends Emittery.Typed<undefined, "ready" | "close">
  implements
    types.Connector<
      EthereumApi,
      JsonRpcTypes.Request<EthereumApi> | JsonRpcTypes.Request<EthereumApi>[],
      JsonRpcTypes.Response
    > {
  #provider: EthereumProvider;

  get provider() {
    return this.#provider;
  }

  constructor(
    providerOptions: ProviderOptions = null,
    executor: utils.Executor
  ) {
    super();

    const provider = (this.#provider = new EthereumProvider(
      providerOptions,
      executor
    ));
    provider.on("connect", () => {
      // tell the consumer (like a `ganache-core` server/connector) everything is ready
      this.emit("ready");
    });
  }
  addRoutes(app: TemplatedApp): void {}

  parse(message: Buffer) {
    try {
      return JSON.parse(message) as JsonRpcTypes.Request<EthereumApi>;
    } catch (e) {
      throw new CodedError(e.message, ErrorCodes.PARSE_ERROR);
    }
  }

  handle(
    payload:
      | JsonRpcTypes.Request<EthereumApi>
      | JsonRpcTypes.Request<EthereumApi>[],
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
    payload: JsonRpcTypes.Request<EthereumApi>,
    connection: HttpRequest | WebSocket
  ) => {
    const method = payload.method;
    if (method === "eth_subscribe") {
      if (isHttp(connection)) {
        return Promise.reject(
          new CodedError(
            "notifications not supported",
            ErrorCodes.METHOD_NOT_SUPPORTED
          )
        );
      }
    }
    const params = payload.params as Parameters<EthereumApi[typeof method]>;
    return this.#provider._requestRaw({ method, params });
  };

  format(
    result: any,
    payload: JsonRpcTypes.Request<EthereumApi>
  ): RecognizedString;
  format(
    results: any[],
    payloads: JsonRpcTypes.Request<EthereumApi>[]
  ): RecognizedString;
  format(
    results: any | any[],
    payload:
      | JsonRpcTypes.Request<EthereumApi>
      | JsonRpcTypes.Request<EthereumApi>[]
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
    payload: JsonRpcTypes.Request<EthereumApi>
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
