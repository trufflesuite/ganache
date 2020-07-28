import {ProviderOptions} from "@ganache/options";
import Emittery from "emittery";
import EthereumApi from "./api";
import JsonRpc from "@ganache/utils/src/things/jsonrpc";
import EthereumOptions from "./options";
import cloneDeep from "lodash.clonedeep";
import {types, utils} from "@ganache/utils";
import PromiEvent from "@ganache/utils/src/things/promievent";

interface Callback {
  (err?: Error, response?: JsonRpc.Response): void;
}

type RequestParams<Method extends types.KnownKeys<EthereumApi>> = {
  readonly method: Method, readonly params: Parameters<EthereumApi[Method]> | undefined
};

export default class EthereumProvider extends Emittery.Typed<{message: any}, "connect" | "disconnect">
  implements types.Provider<EthereumApi>
  {
  #options: ProviderOptions;
  #api: EthereumApi;
  #executor: utils.Executor;

  constructor(providerOptions: ProviderOptions = null, executor: utils.Executor) {
    super();
    const _providerOptions = (this.#options = ProviderOptions.getDefault(providerOptions));
    this.#executor = executor;

    this.#api = new EthereumApi(_providerOptions as EthereumOptions, this);
  }

  /**
   * Returns the options, including defaults and generated, used to start Ganache.
   */
  public getOptions() {
    return cloneDeep(this.#options);
  }

  public send(payload: JsonRpc.Request<EthereumApi>, callback?: Callback): void;
  public send(method: types.KnownKeys<EthereumApi>, params?: Parameters<EthereumApi[typeof method]>): Promise<any>;
  public send(arg1: types.KnownKeys<EthereumApi> | JsonRpc.Request<EthereumApi>, arg2?: Callback | any[]): Promise<any> {
    let method: types.KnownKeys<EthereumApi>;
    let params: any;
    let response: Promise<{}>;
    if (typeof arg1 === "string") {
      method = arg1;
      params = arg2 as Parameters<EthereumApi[typeof method]>;
      response = this.request({method, params});
    } else if (typeof arg2 === "function") {
      // handle backward compatibility with callback-style ganache-core
      const payload = arg1;
      const callback = arg2 as Callback;
      method = payload.method as types.KnownKeys<EthereumApi>;
      params = payload.params;

      this.request({method, params})
        .then((result: any) => {
          // execute the callback on the nextTick so errors thrown in the callback
          // don't cause the error to bubble up to ganache-core
         process.nextTick(callback, null, JsonRpc.Response(payload.id, JSON.parse(JSON.stringify(result))))
        }).catch((err: Error) => {
          process.nextTick(callback, err);
        });
    } else {
      throw new Error(
        "No callback provided to provider's send function. As of web3 1.0, provider.send " +
          "is no longer synchronous and must be passed a callback as its final argument."
      );
    }

    const _options = this.#options;
    if (_options.verbose) {
      _options.logger.log(
        `   >  ${method}: ${params == null ? params : JSON.stringify(params, null, 2).split("\n").join("\n   > ")}`
      );
    }

    return response;
  }

  /**
   * Legacy callback style API
   * @param payload JSON-RPC payload
   * @param callback callback
   */
  public sendAsync(payload: JsonRpc.Request<EthereumApi>, callback?: Callback): void {
    return this.send(payload, callback);
  }

  public request<Method extends types.KnownKeys<EthereumApi> = types.KnownKeys<EthereumApi>>(request: Parameters<EthereumApi[Method]>["length"] extends 0 ? {method: Method} : never): any; // ReturnType<EthereumApi[Method]>;
  public request<Method extends types.KnownKeys<EthereumApi> = types.KnownKeys<EthereumApi>>(request: RequestParams<Method>): any; // ReturnType<EthereumApi[Method]>;
  public request<Method extends types.KnownKeys<EthereumApi> = types.KnownKeys<EthereumApi>>({method, params}: RequestParams<Method>) {
    return this.#executor.execute(this.#api, method, params).then(result => {
      const promise = result.value as PromiseLike<ReturnType<EthereumApi[Method]>>;
      if (promise instanceof PromiEvent) {
        promise.on("message", (data) => {
          // EIP-1193
          this.emit("message" as never, data as never);
          // legacy
          this.emit("data" as never, {
            jsonrpc: "2.0",
            method: "eth_subscription",
            params: (data as any).data
          } as never);
        });
      }
      return promise.then(JSON.stringify).then(JSON.parse);
    })
  }

  public disconnect = async () => {
    await this.emit("disconnect");
    return;
  };
}
