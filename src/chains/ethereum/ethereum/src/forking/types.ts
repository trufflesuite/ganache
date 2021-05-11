import { JsonRpcTypes } from "@ganache/utils";

export interface Handler {
  request: <T>(method: string, params: unknown[]) => Promise<T>;
  close: () => Promise<void>;
}

export type JsonRpcResponse = JsonRpcTypes.Error | JsonRpcTypes.Response;
