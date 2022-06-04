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
import {
  DataEvent,
  VmAfterTransactionEvent,
  VmBeforeTransactionEvent,
  VmStepEvent,
  MessageEvent
} from "./provider-events";
import { ConsoleLogs } from "./miner/decoding";

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

/**
 * Detects when a ganache:vm:tx:step listener is active and signals the onChange
 * function when the status changes
 * @param provider -
 * @param onChange -
 */
function hookEventSystem(
  provider: EthereumProvider,
  onChange: (status: boolean) => void
) {
  let listenerCount = 0;
  provider.on(Emittery.listenerAdded as any, ({ eventName }) => {
    if (eventName === "ganache:vm:tx:step" || eventName === undefined) {
      if (listenerCount === 0) {
        onChange(true);
      }
      listenerCount++;
    }
  });
  provider.on(Emittery.listenerRemoved as any, ({ eventName }) => {
    if (eventName === "ganache:vm:tx:step" || eventName === undefined) {
      listenerCount--;
      if (listenerCount === 0) {
        onChange(false);
      }
    }
  });
}

type Primitives = string | number | null | undefined | symbol | bigint;

// Externalize changes any `Quantity`, `Data`, `ITraceData` types into `string`
// as that's how they are after being serialized to JSON. It's be nice if
// `JSON.stringify` did that for us, as our types implement `toJSON()`, but it
// doesn't
export type Externalize<X> =
  // if X is a Primitive return it as is
  X extends Primitives
    ? X
    : // if X is a Quantity | Data | ITraceData return `string`
    X extends Quantity | Data | ITraceData
    ? string
    : // if X can be iterated iterate and recurse on each element
      { [N in keyof X]: Externalize<X[N]> };

// Simplify makes the types more readable
type Simplify<Type> = Promise<
  Type extends Promise<infer X> ? Externalize<X> : never
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
export class EthereumProvider
  extends Emittery<{
    message: MessageEvent;
    data: DataEvent;
    error: Error;
    "ganache:vm:tx:step": VmStepEvent;
    "ganache:vm:tx:before": VmBeforeTransactionEvent;
    "ganache:vm:tx:after": VmAfterTransactionEvent;
    "ganache:vm:tx:console.log": ConsoleLogs;
    connect: undefined;
    disconnect: undefined;
  }>
  implements Provider<EthereumApi>
{
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
    const fork =
      providerOptions.fork.url ||
      providerOptions.fork.provider ||
      providerOptions.fork.network;
    const fallback = fork ? new Fork(providerOptions, accounts) : null;
    const coinbase = parseCoinbase(providerOptions.miner.coinbase, accounts);
    const blockchain = new Blockchain(providerOptions, coinbase, fallback);
    this.#blockchain = blockchain;

    blockchain.on("ganache:vm:tx:before", event => {
      this.emit("ganache:vm:tx:before", event);
    });
    blockchain.on("ganache:vm:tx:step", event => {
      this.emit("ganache:vm:tx:step", event);
    });
    blockchain.on("ganache:vm:tx:after", event => {
      this.emit("ganache:vm:tx:after", event);
    });
    blockchain.on("ganache:vm:tx:console.log", logs => {
      providerOptions.logging.logger.log(...logs);
      this.emit("ganache:vm:tx:console.log", logs);
    });

    hookEventSystem(this, (enable: boolean) => {
      blockchain.toggleStepEvent(enable);
    });

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
  public removeListener: Emittery["off"] = this.off;

  /**
   * @param method - the params
   * @param params - the params
   * @internal Non standard! Do not use.
   */
  public send<Method extends RequestMethods>(
    method: Method,
    params?: OverloadedParameters<EthereumApi[typeof method]>
  ): Simplify<ReturnType<EthereumApi[typeof method]>>;
  /**
   * @param payload - payload
   * @param callback - callback
   * @deprecated Use the `request` method
   */
  public send<Method extends RequestMethods>(
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
  public send<Method extends RequestMethods>(
    payloads: JsonRpcRequest<EthereumApi, Method>[],
    callback?: BatchedCallback
  ): undefined;
  public send<Method extends RequestMethods>(
    arg1:
      | Method
      | JsonRpcRequest<EthereumApi, Method>
      | JsonRpcRequest<EthereumApi, Method>[],
    arg2?:
      | OverloadedParameters<EthereumApi[Method]>
      | Callback
      | BatchedCallback
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
      | JsonRpcRequest<EthereumApi, Method>
      | JsonRpcRequest<EthereumApi, Method>[],
    arg2?: Callback | BatchedCallback
  ) {
    this.#send(arg1, arg2);
  }

  #send = <Method extends RequestMethods>(
    arg1:
      | RequestMethods
      | JsonRpcRequest<EthereumApi, Method>
      | JsonRpcRequest<EthereumApi, Method>[],
    arg2?:
      | OverloadedParameters<EthereumApi[Method]>
      | Callback
      | BatchedCallback
  ): Promise<{}> | void => {
    let method: RequestMethods;
    let params: any;
    let response: Promise<{}> | undefined;
    if (typeof arg1 === "string") {
      // this signature is (not) non-standard and is only a ganache thing!!!
      // we should probably remove it, but I really like it so I haven't yet.
      method = arg1;
      params = arg2 as unknown as OverloadedParameters<EthereumApi[Method]>;
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
   * @param args -
   * @returns A Promise that resolves with the method's result or rejects with a CodedError
   * @EIP [1193](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md)
   */
  public async request<Method extends RequestMethods>(
    args: RequestParams<Method>
  ): Simplify<ReturnType<EthereumApi[Method]>> {
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
    const promise = result.value as Simplify<typeof result.value>;
    if (promise instanceof PromiEvent) {
      promise.on("message", data => {
        const normalizedData = JSON.parse(JSON.stringify(data));
        // EIP-1193
        this.emit("message", normalizedData as any);
        // legacy
        this.emit("data", {
          jsonrpc: "2.0",
          method: "eth_subscription",
          params: (normalizedData as any).data
        });
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
    } catch (error: any) {
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
