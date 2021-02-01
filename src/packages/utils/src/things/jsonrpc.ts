import { Api, KnownKeys } from "../types";
type JSError = Error;

namespace JsonRpc {
  const jsonrpc = "2.0";
  type JsonRpc = {
    readonly id: string;
    readonly jsonrpc: string;
    toString(): string;
  };
  export type Request<Ledger extends Api> = JsonRpc & {
    readonly id: string;
    readonly jsonrpc: string;
    readonly method: KnownKeys<Ledger>;
    readonly params?: any[];
  };
  export type Response = JsonRpc & {
    readonly result: any;
  };
  export type Error = JsonRpc & {
    readonly error: {
      readonly [key: string]: unknown;
      readonly code: ErrorCode;
      readonly message: any;
    };
    readonly result?: any;
  };
  export const Request = <Ledger extends Api>(json: any): Request<Ledger> => {
    return {
      id: json.id,
      jsonrpc,
      method: json.method,
      params: json.params
    };
  };
  export const Response = (id: string, result: any): Response => {
    return {
      id: id,
      jsonrpc,
      result
    };
  };
  export const Error = <T extends JSError & { code: number }>(
    id: string,
    error: T,
    result?: unknown
  ): Error => {
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
      details.code = ErrorCode.PARSE_ERROR;
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

  export enum ErrorCode {
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
}

export default JsonRpc;
