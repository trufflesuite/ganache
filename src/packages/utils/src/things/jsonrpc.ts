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
      readonly code: number;
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
}

export default JsonRpc;
