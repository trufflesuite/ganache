import { JsonRpcTypes } from "@ganache/utils";

export interface Handler {
  request: (method: string, params: unknown[]) => Promise<unknown>;
}

export type JsonRpcResponse = JsonRpcTypes.Error | JsonRpcTypes.Response;
