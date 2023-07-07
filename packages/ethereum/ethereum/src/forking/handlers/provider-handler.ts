import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { BaseHandler } from "./base-handler";
import { Handler } from "../types";

import { JsonRpcError, JsonRpcResponse } from "@ganache/utils";

type JsonRpc = JsonRpcResponse | JsonRpcError;
export class ProviderHandler extends BaseHandler implements Handler {
  private _request: (
    method: string,
    params: unknown[]
  ) => Promise<{
    response: { result: any } | { error: { message: string; code: number } };
    raw: string;
  }>;
  constructor(options: EthereumInternalOptions, abortSignal: AbortSignal) {
    super(options, abortSignal);
    const provider = options.fork.provider;

    if (typeof provider.request === "function") {
      this._request = async (method: string, params: unknown[]) => {
        try {
          const result = await provider.request({ method, params });
          const response = { result };
          return { response, raw: JSON.stringify(response) };
        } catch (error: any) {
          // if this doesn't appear to be a JSON-RPC "coded" error it might be
          // a network level error, or something else we don't know how to
          // handle. Throw so stack traces are preserved.
          if (typeof error.code !== "number") throw error;
          return {
            response: { error },
            raw: null
          };
        }
      };
    } else if (typeof (provider as any).send === "function") {
      this._request = async (method: string, params: unknown[]) => {
        return await new Promise((resolve, reject) => {
          const request = {
            id: this.id++,
            jsonrpc: "2.0",
            method,
            params
          };
          (provider as any).send(request, (err: Error, response: JsonRpc) => {
            if (err) return void reject(err);
            resolve({
              response,
              raw: JSON.stringify(response)
            });
          });
        });
      };
    } else {
      throw new Error("Forking `provider` must be EIP-1193 compatible");
    }
  }
  public async request<T>(
    method: string,
    params: unknown[],
    options = { disableCache: false }
  ) {
    // format params via JSON stringification because the params might
    // be Quantity or Data, which aren't valid as `params` themselves,
    // but when JSON stringified they are
    const strParams = JSON.stringify(params);

    return await this.queueRequest<T>(
      method,
      params,
      `${method}:${strParams}`,
      () => this._request(method, JSON.parse(strParams) as unknown[]),
      options
    );
  }
}
