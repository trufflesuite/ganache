import Emittery from "emittery";
import EthereumApi from "./api";
import {
  Connector as IConnector,
  Executor,
  makeError,
  makeResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcErrorCode,
  KnownKeys
} from "@ganache/utils";
import EthereumProvider from "./provider";
import {
  RecognizedString,
  WebSocket,
  HttpRequest
} from "@trufflesuite/uws-js-unofficial";
import { CodedError } from "@ganache/ethereum-utils";
import {
  EthereumProviderOptions,
  EthereumLegacyProviderOptions
} from "@ganache/ethereum-options";
import { bufferify } from "./helpers/bufferify";

type ProviderOptions = EthereumProviderOptions | EthereumLegacyProviderOptions;
export type Provider = EthereumProvider;
export const Provider = EthereumProvider;

const BUFFERIFY_THRESHOLD = 100000;

function isHttp(
  connection: HttpRequest | WebSocket
): connection is HttpRequest {
  return (
    connection.constructor.name === "uWS.HttpRequest" ||
    connection.constructor.name === "HttpRequest"
  );
}

export class Connector<
    R extends JsonRpcRequest<
      EthereumApi,
      KnownKeys<EthereumApi>
    > = JsonRpcRequest<EthereumApi, KnownKeys<EthereumApi>>
  >
  extends Emittery.Typed<undefined, "ready" | "close">
  implements IConnector<EthereumApi, R | R[], JsonRpcResponse> {
  #provider: EthereumProvider;

  get provider() {
    return this.#provider;
  }

  constructor(providerOptions: ProviderOptions = null, executor: Executor) {
    super();

    this.#provider = new EthereumProvider(providerOptions, executor);
  }

  public BUFFERIFY_THRESHOLD = BUFFERIFY_THRESHOLD;

  async connect() {
    await this.#provider.initialize();
    // no need to wait for #provider.once("connect") as the initialize()
    // promise has already accounted for that after the promise is resolved
    await this.emit("ready");
  }

  parse(message: Buffer) {
    try {
      return JSON.parse(message) as R;
    } catch (e) {
      throw new CodedError(e.message, JsonRpcErrorCode.PARSE_ERROR);
    }
  }

  handle(payload: R | R[], connection: HttpRequest | WebSocket) {
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
  #handle = (payload: R, connection: HttpRequest | WebSocket) => {
    const method = payload.method;
    if (method === "eth_subscribe") {
      if (isHttp(connection)) {
        return Promise.reject(
          new CodedError(
            "notifications not supported",
            JsonRpcErrorCode.METHOD_NOT_SUPPORTED
          )
        );
      }
    }
    const params = payload.params as Parameters<EthereumApi[typeof method]>;
    return this.#provider._requestRaw({ method, params });
  };

  format(result: any, payload: R): RecognizedString;
  format(results: any[], payloads: R[]): RecognizedString;
  format(results: any | any[], payload: R | R[]): RecognizedString {
    if (Array.isArray(payload)) {
      return JSON.stringify(
        payload.map((payload, i) => {
          const result = results[i];
          if (result instanceof Error) {
            return makeError(payload.id, result as any);
          } else {
            return this.format(result, payload);
          }
        })
      );
    } else {
      const json = makeResponse(payload.id, results);
      if (
        payload.method === "debug_traceTransaction" &&
        // for "large" debug_traceTransaction results convert directly to
        // a Buffer instead of JSON.stringify so we don't hit V8's maximum
        // string length limit of 1GB. We don't do this for everything
        // because the bufferfication is so very very slow
        // TODO(perf): an even better way of solving this would be to convert
        // `debug_traceTransaction` to a generator that yields chunks (of
        // Buffer) as soon as they're available. We could then `write` these
        // individual chunks immediately.
        results.structLogs.length > this.BUFFERIFY_THRESHOLD
      ) {
        return bufferify(json, "");
      } else {
        return JSON.stringify(json);
      }
    }
  }

  formatError(error: Error & { code: number }, payload: R): RecognizedString {
    const json = makeError(payload && payload.id ? payload.id : null, error);
    return JSON.stringify(json);
  }

  close() {
    return this.#provider.disconnect();
  }
}
