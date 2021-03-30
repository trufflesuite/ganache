import Emittery from "emittery";
import EthereumApi from "./api";
import { JsonRpcTypes } from "@ganache/utils";
import {
  EthereumProviderOptions,
  EthereumInternalOptions,
  EthereumOptionsConfig,
  EthereumLegacyOptions
} from "@ganache/ethereum-options";
import cloneDeep from "lodash.clonedeep";
import { PromiEvent, types, utils } from "@ganache/utils";
import Wallet from "./wallet";
declare type RequestMethods = types.KnownKeys<EthereumApi>;

type mergePromiseGenerics<Type> = Promise<
  Type extends Promise<infer X> ? X : never
>;

interface Callback {
  (err?: Error, response?: JsonRpcTypes.Response | JsonRpcTypes.Error): void;
}

interface BatchedCallback {
  (
    err?: Error,
    response?: (JsonRpcTypes.Response | JsonRpcTypes.Error)[]
  ): void;
}

type RequestParams<Method extends RequestMethods> = {
  readonly method: Method;
  readonly params: Parameters<EthereumApi[Method]> | undefined;
};

const hasOwn = utils.hasOwn;

export default class EthereumProvider
  extends Emittery.Typed<{ message: any }, "connect" | "disconnect">
  implements types.Provider<EthereumApi> {
  #options: EthereumInternalOptions;
  #api: EthereumApi;
  #executor: utils.Executor;
  #wallet: Wallet;

  constructor(
    options: EthereumProviderOptions | EthereumLegacyOptions = {},
    executor: utils.Executor
  ) {
    super();
    const providerOptions = (this.#options = EthereumOptionsConfig.normalize(
      options as EthereumProviderOptions
    ));

    this.#executor = executor;
    const wallet = (this.#wallet = new Wallet(providerOptions.wallet));

    this.#api = new EthereumApi(providerOptions, wallet, this);
  }

  async initialize() {
    await this.#api.initialize();
    await this.emit("connect");
  }

  /**
   * Returns the options, including defaults and generated, used to start Ganache.
   */
  public getOptions() {
    return cloneDeep(this.#options);
  }

  /**
   * Returns the unlocked accounts
   */
  public getInitialAccounts() {
    const accounts: Record<
      string,
      { unlocked: boolean; secretKey: string; balance: bigint }
    > = {};
    const wallet = this.#wallet;
    const unlockedAccounts = this.#wallet.unlockedAccounts;
    wallet.initialAccounts.forEach(account => {
      const address = account.address.toString();
      accounts[address] = {
        secretKey: account.privateKey.toString(),
        balance: account.balance.toBigInt(),
        unlocked: unlockedAccounts.has(address)
      };
    });
    return accounts;
  }

  /**
   * Remove an event subscription
   */
  public removeListener = this.off;

  /**
   * @param payload
   * @param callback
   * @deprecated Use the `request` method
   */
  public send(
    payload: JsonRpcTypes.Request<EthereumApi>,
    callback?: Callback
  ): undefined;
  /**
   * Legacy callback style API
   * @param payload JSON-RPC payload
   * @param callback callback
   * @deprecated Batch transactions have been deprecated. Send payloads
   * individually via the `request` method.
   */
  public send(
    payloads: JsonRpcTypes.Request<EthereumApi>[],
    callback?: BatchedCallback
  ): undefined;
  /**
   * @param method
   * @param params
   * @ignore Non standard! Do not use.
   */
  public send(
    method: RequestMethods,
    params?: Parameters<EthereumApi[typeof method]>
  ): any;
  public send(
    arg1:
      | RequestMethods
      | JsonRpcTypes.Request<EthereumApi>
      | JsonRpcTypes.Request<EthereumApi>[],
    arg2?: Callback | BatchedCallback | any[]
  ) {
    return this.#send(arg1, arg2);
  }

  /**
   * Legacy callback style API
   * @param payload JSON-RPC payload
   * @param callback callback
   * @deprecated Use the `request` method.
   */
  public sendAsync(
    payload: JsonRpcTypes.Request<EthereumApi>,
    callback?: Callback | BatchedCallback
  ): void {
    this.#send(payload, callback);
  }

  #send = (
    arg1:
      | RequestMethods
      | JsonRpcTypes.Request<EthereumApi>
      | JsonRpcTypes.Request<EthereumApi>[],
    arg2?: Callback | BatchedCallback | any[]
  ): Promise<{}> | void => {
    let method: RequestMethods;
    let params: any;
    let response: Promise<{}> | undefined;
    if (typeof arg1 === "string") {
      // this signature is (not) non-standard and is only a ganache thing!!!
      // we should probably remove it, but I really like it so I haven't yet.
      method = arg1;
      params = arg2 as Parameters<EthereumApi[typeof method]>;
      response = this.request({ method, params });
    } else if (typeof arg2 === "function") {
      // handle backward compatibility with callback-style ganache-core
      if (Array.isArray(arg1)) {
        const callback = arg2 as BatchedCallback;
        this.#legacySendPayloads(arg1).then(({ error, result }) => {
          callback(error, result);
        });
      } else {
        const callback = arg2 as Callback;
        this.#legacySendPayload(arg1).then(({ error, result }) => {
          callback(error, result);
        });
      }
    } else {
      throw new Error(
        "No callback provided to provider's send function. As of web3 1.0, provider.send " +
          "is no longer synchronous and must be passed a callback as its final argument."
      );
    }

    return response;
  };

  /**
   * EIP-1193 style request method
   * @param args
   * @returns A Promise that resolves with the method's result or rejects with a CodedError
   * @EIP [1193](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md)
   */
  public async request<Method extends RequestMethods>(
    args: Parameters<EthereumApi[Method]>["length"] extends 0
      ? Pick<RequestParams<Method>, "method">
      : never
  ): mergePromiseGenerics<ReturnType<EthereumApi[Method]>>;
  /**
   * EIP-1193 style request method
   * @param args
   * @returns A Promise that resolves with the method's result or rejects with a CodedError
   * @EIP [1193](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md)
   */
  public async request<Method extends RequestMethods>(
    args: RequestParams<Method>
  ): mergePromiseGenerics<ReturnType<EthereumApi[Method]>>;
  public async request<Method extends RequestMethods>(
    args: RequestParams<Method>
  ) {
    const rawResult = await this._requestRaw(args);
    const value = await rawResult.value;
    return JSON.parse(JSON.stringify(value));
  }

  /**
   * INTERNAL. Used when the caller wants to access the orignal `PromiEvent`, which would
   * otherwise be flattened into a regular Promise through the Promise chain.
   * @param request
   */
  public async _requestRaw<Method extends RequestMethods>({
    method,
    params
  }: RequestParams<Method>) {
    this.#logRequest(method, params);

    const result = await this.#executor.execute(this.#api, method, params);
    const promise = result.value as mergePromiseGenerics<typeof result.value>;
    if (promise instanceof PromiEvent) {
      promise.on("message", data => {
        // EIP-1193
        this.emit("message" as never, data as never);
        // legacy
        this.emit(
          "data" as never,
          {
            jsonrpc: "2.0",
            method: "eth_subscription",
            params: (data as any).data
          } as never
        );
      });
    }
    const value = promise.catch((error: Error) => {
      if (this.#options.chain.vmErrorsOnRPCResponse) {
        if (hasOwn(error, "result")) {
          // stringify the result here
          // TODO: not sure why the stringification is even needed.
          (error as any).result = JSON.parse(
            JSON.stringify((error as any).result)
          );
        }
      }
      // then rethrow
      throw error;
    });
    return { value: value };
  }

  #logRequest = (
    method: string,
    params: Parameters<EthereumApi[typeof method]>
  ) => {
    const options = this.#options;
    if (options.logging.verbose) {
      options.logging.logger.log(
        `   >  ${method}: ${
          params == null
            ? params
            : JSON.stringify(params, null, 2).split("\n").join("\n   > ")
        }`
      );
    } else {
      options.logging.logger.log(method);
    }
  };

  public disconnect = async () => {
    await this.emit("disconnect");
    return;
  };

  //#region legacy
  #legacySendPayloads = (payloads: JsonRpcTypes.Request<EthereumApi>[]) => {
    return Promise.all(payloads.map(this.#legacySendPayload)).then(results => {
      let mainError: Error = null;
      const responses: (JsonRpcTypes.Response | JsonRpcTypes.Error)[] = [];
      results.forEach(({ error, result }, i) => {
        responses.push(result);
        if (error) {
          if (mainError == null) {
            mainError = new Error("Batch error:") as Error & { errors: [] };
          }
          (mainError as any).errors[i] = error;
        }
      });
      return { error: mainError, result: responses };
    });
  };

  #legacySendPayload = async (payload: JsonRpcTypes.Request<EthereumApi>) => {
    const method = payload.method as RequestMethods;
    const params = payload.params as Parameters<EthereumApi[typeof method]>;
    try {
      const result = await this.request({ method, params });
      return {
        error: null as JsonRpcTypes.Error,
        result: JsonRpcTypes.Response(
          payload.id,
          JSON.parse(JSON.stringify(result))
        )
      };
    } catch (error) {
      let result: any;
      // In order to provide `vmErrorsOnRPCResponse`, the `error` might have
      // a `result` property that we need to move to the result field. Yes,
      // it's super weird behavior!
      if (hasOwn(error, "result")) {
        result = error.result;
        delete error.result;
      }
      return { error, result: JsonRpcTypes.Error(payload.id, error, result) };
    }
  };
  //#endregion
}
