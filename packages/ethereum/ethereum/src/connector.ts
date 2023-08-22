import EthereumApi from "./api";
import {
  Executor,
  makeError,
  makeResponse,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcErrorCode,
  KnownKeys
} from "@ganache/utils";
export type { EthereumProvider } from "./provider";
import { EthereumProvider } from "./provider";
import type {
  RecognizedString,
  WebSocket,
  HttpRequest,
  Connector as IConnector
} from "@ganache/flavor";
import { CodedError } from "@ganache/ethereum-utils";
import {
  EthereumProviderOptions,
  EthereumLegacyProviderOptions
} from "@ganache/ethereum-options";
import { bufferify } from "./helpers/bufferify";

function isHttp(
  connection: HttpRequest | WebSocket<void>
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
> implements IConnector<EthereumProvider, R | R[], JsonRpcResponse>
{
  #provider: EthereumProvider;

  static BUFFERIFY_THRESHOLD: number = 100000;

  get provider(): EthereumProvider {
    return this.#provider;
  }

  constructor(providerOptions: EthereumProviderOptions | EthereumLegacyProviderOptions = null, executor: Executor) {
    this.#provider = new EthereumProvider(providerOptions, executor);
  }

  public BUFFERIFY_THRESHOLD = Connector.BUFFERIFY_THRESHOLD;

  async connect() {
    await this.#provider.initialize();
  }

  parse(message: Buffer) {
    try {
      return JSON.parse(message) as R;
    } catch (e: any) {
      throw new CodedError(e.message, JsonRpcErrorCode.PARSE_ERROR);
    }
  }

  handle(payload: R | R[], connection: HttpRequest | WebSocket<void>) {
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
  #handle = (payload: R, connection: HttpRequest | WebSocket<void>) => {
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

  format(
    result: any,
    payload: R
  ): RecognizedString | Generator<RecognizedString>;
  format(result: any, payload: R): RecognizedString;
  format(results: any[], payloads: R[]): RecognizedString;
  format(
    results: any | any[],
    payload: R | R[]
  ): RecognizedString | Generator<RecognizedString> {
    if (Array.isArray(payload)) {
      return JSON.stringify(
        payload.map((payload, i) => {
          const result = results[i];
          if (result instanceof Error) {
            return makeError(payload.id, result as any);
          } else {
            return makeResponse(payload.id, result);
          }
        })
      );
    } else {
      const json = makeResponse(payload.id, results);
      if (
        payload.method === "debug_traceTransaction" &&
        typeof results === "object" &&
        Array.isArray(results.structLogs) &&
        // for "large" debug_traceTransaction results we convert to individual
        // parts of the response to Buffers, yielded via a Generator function,
        // instead of using JSON.stringify. This is necessary because we:
        //   * avoid V8's maximum string length limit of 1GB
        //   * avoid and the max Buffer length limit of ~2GB (on 64bit
        //     architectures).
        //   * avoid heap allocation failures due to trying to hold too much
        //     data in memory (which can happen if we don't immediately consume
        //     the `format` result -- by buffering everything into one array,
        //     for example)
        //
        // We don't do this for everything because the bufferfication is so very
        // very slow.
        //
        // TODO(perf): an even better way of solving this would be to convert
        // `debug_traceTransaction` to a generator that yields chunks (of
        // Buffer) as soon as they're available. We could then `write` these
        // individual chunks immediately and our memory use would stay
        // relatively low and constant.
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
