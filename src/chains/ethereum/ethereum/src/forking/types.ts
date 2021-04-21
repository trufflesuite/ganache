import { JsonRpcTypes } from "@ganache/utils";

export interface Handler {
  request: <T>(method: string, params: unknown[]) => Promise<T>;
}

export type JsonRpcResponse = JsonRpcTypes.Error | JsonRpcTypes.Response;
