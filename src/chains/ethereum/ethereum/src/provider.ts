import Emittery from "emittery";
import EthereumApi from "./api";
import {
  Executor,
  hasOwn,
  KnownKeys,
  Provider,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  makeResponse,
  makeError,
  Quantity,
  Data,
  OverloadedParameters,
  PromiEvent
} from "@ganache/utils";
import {
  EthereumProviderOptions,
  EthereumInternalOptions,
  EthereumOptionsConfig,
  EthereumLegacyProviderOptions
} from "@ganache/ethereum-options";
import cloneDeep from "lodash.clonedeep";
import Wallet from "./wallet";
import Blockchain from "./blockchain";
import { Fork } from "./forking/fork";
import { ITraceData, Account } from "@ganache/ethereum-utils";
import { Address } from "@ganache/ethereum-address";

declare type RequestMethods = KnownKeys<EthereumApi>;

function parseCoinbase(
  coinbase: string | number | Address,
  initialAccounts: Account[]
) {
  switch (typeof coinbase) {
    case "object":
      return coinbase;
    case "number":
      const account = initialAccounts[coinbase];
      if (account) {
        return account.address;
      } else {
        throw new Error(`invalid coinbase address index: ${coinbase}`);
      }
    case "string":
      return Address.from(coinbase);
    default: {
      throw new Error(
        `coinbase address must be string or number, received: ${coinbase}`
      );
    }
  }
}

type Primitives = string | number | null | undefined | symbol | bigint;
type Clean<X> = X extends Primitives
  ? X
  : X extends Quantity | Data | ITraceData
  ? string
  : { [N in keyof X]: Clean<X[N]> };

type cleanAndMergePromiseGenerics<Type> = Promise<
  Type extends Promise<infer X> ? Clean<X> : never
>;

interface Callback {
  (err?: Error, response?: JsonRpcResponse | JsonRpcError): void;
}

interface BatchedCallback {
  (err?: Error, response?: (JsonRpcResponse | JsonRpcError)[]): void;
}

type RequestParams<Method extends RequestMethods> = {
  readonly method: Method;
  readonly params: OverloadedParameters<EthereumApi[Method]> | undefined;
};
export default class EthereumProvider
  extends Emittery.Typed<
    { message: any; error: Error },
    "connect" | "disconnect"
  >
  implements Provider<EthereumApi> {
  #options: EthereumInternalOptions;
  #api: EthereumApi;
  #executor: Executor;
  #wallet: Wallet;
  readonly #blockchain: Blockchain;

  constructor(
    options: EthereumProviderOptions | EthereumLegacyProviderOptions = {},
    executor: Executor
  ) {
    super();
    this.#executor = executor;

    const providerOptions = (this.#options = EthereumOptionsConfig.normalize(
      options as EthereumProviderOptions
    ));

    const wallet = (this.#wallet = new Wallet(providerOptions.wallet));
    const accounts = wallet.initialAccounts;
    const fork = providerOptions.fork.url || providerOptions.fork.provider;
    const fallback = fork ? new Fork(providerOptions, accounts) : null;
    const coinbase = parseCoinbase(providerOptions.miner.coinbase, accounts);
    const blockchain = new Blockchain(providerOptions, coinbase, fallback);
    this.#blockchain = blockchain;
    this.#api = new EthereumApi(providerOptions, wallet, blockchain);
  }

  async initialize() {
    await this.#blockchain.initialize(this.#wallet.initialAccounts);
    this.emit("connect");
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
   * @param method - the params
   * @param params - the params
   * @ignore Non standard! Do not use.
   */
  public send<Method extends RequestMethods>(
    method: Method,
    params?: OverloadedParameters<EthereumApi[typeof method]>
  ): cleanAndMergePromiseGenerics<ReturnType<EthereumApi[typeof method]>>;
  /**
   * @param payload - payload
   * @param callback - callback
   * @deprecated Use the `request` method
   */
  public send<Method extends KnownKeys<EthereumApi>>(
    payload: JsonRpcRequest<EthereumApi, Method>,
    callback?: Callback
  ): undefined;
  /**
   * Legacy callback style API
   * @param payloads - JSON-RPC payload
   * @param callback - callback
   * @deprecated Batch transactions have been deprecated. Send payloads
   * individually via the `request` method.
   */
  public send<Method extends KnownKeys<EthereumApi>>(
    payloads: JsonRpcRequest<EthereumApi, Method>[],
    callback?: BatchedCallback
  ): undefined;
  public send<Method extends KnownKeys<EthereumApi>>(
    arg1:
      | RequestMethods
      | JsonRpcRequest<EthereumApi, Method>
      | JsonRpcRequest<EthereumApi, Method>[],
    arg2?: Callback | BatchedCallback
  ) {
    return this.#send(arg1, arg2);
  }

  /**
   * Legacy callback style API
   * @param payload - JSON-RPC payload
   * @param callback - callback
   * @deprecated Use the `request` method.
   */
  /**
   * @param payload - payload
   * @param callback - callback
   * @deprecated Use the `request` method
   */
  public sendAsync<Method extends KnownKeys<EthereumApi>>(
    payload: JsonRpcRequest<EthereumApi, Method>,
    callback?: Callback
  ): undefined;
  /**
   * Legacy callback style API
   * @param payloads - JSON-RPC payload
   * @param callback - callback
   * @deprecated Batch transactions have been deprecated. Send payloads
   * individually via the `request` method.
   */
  public sendAsync<Method extends KnownKeys<EthereumApi>>(
    payloads: JsonRpcRequest<EthereumApi, Method>[],
    callback?: BatchedCallback
  ): undefined;
  public sendAsync<Method extends KnownKeys<EthereumApi>>(
    arg1:
      | RequestMethods
      | JsonRpcRequest<EthereumApi, Method>
      | JsonRpcRequest<EthereumApi, Method>[],
    arg2?: Callback | BatchedCallback
  ) {
    this.#send(arg1, arg2);
  }

  #send = <Method extends KnownKeys<EthereumApi>>(
    arg1:
      | RequestMethods
      | JsonRpcRequest<EthereumApi, Method>
      | JsonRpcRequest<EthereumApi, Method>[],
    arg2?: Callback | BatchedCallback
  ): Promise<{}> | void => {
    let method: RequestMethods;
    let params: any;
    let response: Promise<{}> | undefined;
    if (typeof arg1 === "string") {
      // this signature is (not) non-standard and is only a ganache thing!!!
      // we should probably remove it, but I really like it so I haven't yet.
      method = arg1;
      params = (arg2 as unknown) as OverloadedParameters<EthereumApi[Method]>;
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
   * @param args - the args
   * @returns A Promise that resolves with the method's result or rejects with a CodedError
   * @EIP [1193](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md)
   */
  public async request<Method extends RequestMethods>(
    args: RequestParams<Method>
  ): cleanAndMergePromiseGenerics<ReturnType<EthereumApi[Method]>> {
    const rawResult = await this._requestRaw(args);
    const value = await rawResult.value;
    return JSON.parse(JSON.stringify(value));
  }

  /**
   * INTERNAL. Used when the caller wants to access the original `PromiEvent`,
   * which would otherwise be flattened into a regular Promise through the
   * Promise chain.
   * @param request - the request
   */
  public async _requestRaw<Method extends RequestMethods>({
    method,
    params
  }: RequestParams<Method>) {
    this.#logRequest(method, params);

    const result = await this.#executor.execute(this.#api, method, params);
    const promise = result.value as cleanAndMergePromiseGenerics<
      typeof result.value
    >;
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

  #logRequest = <Method extends RequestMethods>(
    method: Method,
    params: OverloadedParameters<EthereumApi[typeof method]>
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
    await this.#blockchain.stop();
    this.emit("disconnect");
    return;
  };

  //#region legacy
  #legacySendPayloads = <Method extends KnownKeys<EthereumApi>>(
    payloads: JsonRpcRequest<EthereumApi, Method>[]
  ) => {
    return Promise.all(payloads.map(this.#legacySendPayload)).then(results => {
      let mainError: Error = null;
      const responses: (JsonRpcResponse | JsonRpcError)[] = [];
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

  #legacySendPayload = async <Method extends KnownKeys<EthereumApi>>(
    payload: JsonRpcRequest<EthereumApi, Method>
  ) => {
    const method = payload.method as RequestMethods;
    const params = payload.params as OverloadedParameters<
      EthereumApi[typeof method]
    >;
    try {
      const result = await this.request({ method, params });
      return {
        error: null as JsonRpcError,
        result: makeResponse(payload.id, JSON.parse(JSON.stringify(result)))
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
      return { error, result: makeError(payload.id, error, result) };
    }
  };
  //#endregion
}
