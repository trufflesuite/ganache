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

type ProviderOptions = EthereumProviderOptions | EthereumLegacyProviderOptions;
export type Provider = EthereumProvider;
export const Provider = EthereumProvider;

function isHttp(
  connection: HttpRequest | WebSocket
): connection is HttpRequest {
  return (
    connection.constructor.name === "uWS.HttpRequest" ||
    connection.constructor.name === "HttpRequest"
  );
}

function chunkify(val: any, nameOrIndex: string) {
  if (Array.isArray(val)) {
    const l = val.length;
    if (l === 0) {
      return Buffer.from("[]");
    } else {
      const chunkified = chunkify(val[0], "0");
      // if the value ends up being nothing (undefined), return null
      const bufs = [
        Buffer.from("["),
        chunkified.length === 0 ? Buffer.from("null") : chunkified
      ];
      if (l > 1) {
        for (let i = 1; i < l; i++) {
          const v = val[i];
          bufs.push(Buffer.from(","));
          const chunkified = chunkify(v, i.toString());
          // if the value ends up being nothing (undefined), return null
          bufs.push(chunkified.length === 0 ? Buffer.from("null") : chunkified);
        }
      }
      bufs.push(Buffer.from("]"));
      return Buffer.concat(bufs);
    }
  } else if (Object.prototype.toString.call(val) === "[object Object]") {
    if ("toJSON" in val) return chunkify(val.toJSON(nameOrIndex), "") as Buffer;

    const entries = Object.entries(val);
    const l = entries.length;
    if (l === 0) {
      return Buffer.from("{}");
    } else {
      const [key, value] = entries[0];
      let i = 0;
      let bufs = [Buffer.from("{")];

      // find the first non-null property to start the object
      while (i < l) {
        const chunkified = chunkify(value, key);
        // if the chunkified value ends up being nothing (undefined) ignore
        // the property
        if (chunkified.length === 0) {
          i++;
          continue;
        }

        bufs.push(
          ...[Buffer.from(JSON.stringify(key)), Buffer.from(":"), chunkified]
        );
        break;
      }
      if (l > 1) {
        for (let i = 1; i < l; i++) {
          const [key, value] = entries[i];
          const chunkified = chunkify(value, key);
          // if the chunkified value ends up being nothing (undefined) ignore
          // the property
          if (chunkified.length === 0) continue;

          bufs.push(
            ...[
              Buffer.from(","),
              Buffer.from(JSON.stringify(key)),
              Buffer.from(":"),
              chunkified
            ]
          );
        }
      }
      bufs.push(Buffer.from("}"));
      return Buffer.concat(bufs);
    }
  } else if (val === null) {
    return Buffer.from("null");
  } else if (val === undefined) {
    // nothing is returned for undefined
    return Buffer.allocUnsafe(0);
  } else {
    return Buffer.from(JSON.stringify(val));
  }
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
            return makeResponse(payload.id, result);
          }
        })
      );
    } else {
      const json = makeResponse(payload.id, results);
      return chunkify(json, "");
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
