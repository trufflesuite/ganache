import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { BaseHandler } from "./base-handler";
import { Handler } from "../types";
import { AbortSignal } from "abort-controller";
import { CodedError } from "@ganache/ethereum-utils";

export class ProviderHandler extends BaseHandler implements Handler {
  #provider: {
    request: (args: {
      readonly method: string;
      readonly params?: readonly unknown[] | object;
    }) => Promise<unknown>;
  };
  constructor(options: EthereumInternalOptions, abortSignal: AbortSignal) {
    super(options, abortSignal);
    this.#provider = options.fork.provider;
  }
  public async request<T>(method: string, params: unknown[]) {
    const provider = this.#provider;
    // format params via JSON stringification because the params might
    // be Quantity or Data, which aren't valid as `params` themselves,
    // but when JSON stringified they are
    const strParams = JSON.stringify(params);

    // check the LRU cache so we don't make an extra network request
    const key = `{"method":"${method}","params":${strParams}}`;

    if (this.requestCache.has(key)) return this.requestCache.get(key);

    const cachedItem = this.valueCache.get(key);
    if (cachedItem) return JSON.parse(cachedItem);

    const paramCopy = JSON.parse(strParams);

    let result: unknown;
    if (provider.request) {
      result = await provider.request({
        method,
        params: paramCopy
      });
    } else if ((provider as any).send) {
      // TODO: remove support for legacy providers
      // legacy `.send`
      console.warn(
        "WARNING: Ganache forking only supports EIP-1193-compliant providers. Legacy support for send is currently enabled, but will be removed in a future version _without_ a breaking change. To remove this warning, switch to an EIP-1193 provider. This error is probably caused by an old version of Web3's HttpProvider (or ganache < v7)"
      );
      result = await new Promise<T>((resolve, reject) => {
        (provider as any).send(
          {
            id: this.id++,
            jsonrpc: "2.0",
            method,
            params: paramCopy
          },
          (err: Error, response: { result: T } | { error: any }) => {
            if (err) return void reject(err);

            if ("result" in response) {
              resolve(response.result);
            } else if ("error" in response) {
              reject(
                new CodedError(response.error.message, response.error.code)
              );
            } else {
              reject(
                new Error(
                  "Invalid response from fork provider: " +
                    JSON.stringify(response)
                )
              );
            }
          }
        );
      });
    } else {
      throw new Error("Forking `provider` must be EIP-1193 compatible");
    }
    this.valueCache.set(key, JSON.stringify(result));

    return result;
  }
  public close() {
    return Promise.resolve();
  }
}
