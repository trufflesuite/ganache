import { Api, KnownKeys, OverloadedParameters } from "../types";
type JSError = globalThis.Error;

type JsonRpc = {
  readonly id: string;
  readonly jsonrpc: string;
  toString(): string;
};
export type JsonRpcRequest<
  Ledger extends Api,
  Method extends KnownKeys<Ledger>
> = JsonRpc & {
  readonly id: string;
  readonly jsonrpc: string;
  readonly method: Method;
  readonly params?: OverloadedParameters<Ledger[keyof Ledger]>;
};
export type JsonRpcResponse = JsonRpc & {
  readonly result: any;
};
export type JsonRpcError = JsonRpc & {
  readonly error: {
    readonly [key: string]: unknown;
    readonly code: number;
    readonly message: any;
  };
  readonly result?: any;
};

const jsonrpc = "2.0" as const;
export const makeRequest = <
  Ledger extends Api,
  Method extends KnownKeys<Ledger>
>(
  json: any
): JsonRpcRequest<Ledger, Method> => {
  return {
    id: json.id,
    jsonrpc,
    method: json.method,
    params: json.params
  };
};
export const makeResponse = (id: string, result: any): JsonRpcResponse => {
  return {
    id,
    jsonrpc,
    result
  };
};
export const makeError = <T extends JSError & { code: number }>(
  id: string | undefined,
  error: T,
  result?: unknown
): JsonRpcError => {
  type E = { [K in keyof T]: K extends string ? T[K] : never };
  // Error objects are weird, `message` isn't included in the property names,
  // so it is pulled out separately.
  const details = { message: error.message } as E;
  Object.getOwnPropertyNames(error).forEach(name => {
    if (typeof name === "string") {
      details[name] = error[name];
    }
  });
  if (typeof details.code !== "number") {
    details.code = -32700; // JSON-RPC Parse error
  }
  if (result !== undefined) {
    return {
      id,
      jsonrpc,
      error: details,
      result
    };
  } else {
    return {
      id,
      jsonrpc,
      error: details
    };
  }
};

export enum JsonRpcErrorCode {
  /**
   * Invalid JSON was received by the server.
   * An error occurred on the server while parsing the JSON text.
   */
  PARSE_ERROR = -32700,

  /**
   * The JSON sent is not a valid Request object.
   */
  INVALID_REQUEST = -32600,

  /**
   * The method does not exist / is not available.
   */
  METHOD_NOT_FOUND = -32601,

  /**
   * Invalid method parameter(s).
   */
  INVALID_PARAMS = -32602,

  /**
   * Internal JSON-RPC error.
   */
  INTERNAL_ERROR = -32603,

  /**
   * Missing or invalid parameters
   */
  INVALID_INPUT = -32000,

  /**
   * Transaction creation failed
   */
  TRANSACTION_REJECTED = -32003,

  /**
   * 	Method is not implemented
   */
  METHOD_NOT_SUPPORTED = -32004,

  /**
   * 	Request exceeds defined limit
   */
  LIMIT_EXCEEDED = -32005,

  /**
   * Version of JSON-RPC protocol is not supported
   */
  JSON_RPC_VERSION_NOT_SUPPORTED = -32006
}
