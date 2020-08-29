import {ProviderOptions} from "@ganache/options";
import Emittery from "emittery";
import EthereumApi from "./api";
import {JsonRpcTypes} from "@ganache/utils";
import EthereumOptions from "./options";
import cloneDeep from "lodash.clonedeep";
import {PromiEvent, types, utils} from "@ganache/utils";
import Blockchain, { BlockchainOptions } from "./blockchain";
import Wallet from "./wallet";
import Common from "ethereumjs-common";

type mergePromiseGenerics<Type> = Promise<Type extends Promise<infer X> ? X : never>;

interface Callback {
  (err?: Error, response?: JsonRpcTypes.Response): void;
}

type RequestParams<Method extends types.KnownKeys<EthereumApi>> = {
  readonly method: Method, readonly params: Parameters<EthereumApi[Method]> | undefined
};

const hasOwn = ({}).hasOwnProperty.call.bind(({}).hasOwnProperty);

export default class EthereumProvider extends Emittery.Typed<{message: any}, "connect" | "disconnect">
  implements types.Provider<EthereumApi>
  {
  #options: ProviderOptions;
  #api: EthereumApi;
  #executor: utils.Executor;
  #blockchain: Blockchain;

  constructor(providerOptions: ProviderOptions = null, executor: utils.Executor) {
    super();
    this.#options = ProviderOptions.getDefault(providerOptions);
    this.#executor = executor;

    // TODO: This `as BlockchainOptions` is a little gross. Essentially it
    // lets us treat the same object as having two different types. 
    // e.g., this.#options does get altered here regardless of how we view it.
    const blockchainOptions = this.#options as BlockchainOptions;

    const wallet = new Wallet(this.#options);
    const initialAccounts = wallet.initialAccounts;
    blockchainOptions.initialAccounts = initialAccounts;
    blockchainOptions.coinbase = initialAccounts[0];

    blockchainOptions.common = Common.forCustomChain(
      "mainnet", // TODO needs to match chain id
      {
        name: "ganache",
        networkId: this.#options.networkId,
        chainId: this.#options.chainId,
        comment: "Local test network"
      },
      this.#options.hardfork
    );

    this.#blockchain = this.createBlockchain(blockchainOptions);

    this.#blockchain.on("start", () => {
      this.emit("connect");
    });
    this.on("disconnect", () => {
      return this.#blockchain.stop();
    });

    this.#api = new EthereumApi(this.#blockchain, wallet, this.#options as EthereumOptions, blockchainOptions.common);
  }

  protected createBlockchain(blockchainOptions:BlockchainOptions):Blockchain {
    return new Blockchain(blockchainOptions);
  }

  /**
   * Returns the options, including defaults and generated, used to start Ganache.
   */
  public getOptions() {
    return cloneDeep(this.#options);
  }

  public send(payload: JsonRpcTypes.Request<EthereumApi>, callback?: Callback) : any;
  public send(method: types.KnownKeys<EthereumApi>, params?: Parameters<EthereumApi[typeof method]>) : any;
  public send(arg1: types.KnownKeys<EthereumApi> | JsonRpcTypes.Request<EthereumApi>, arg2?: Callback | any[]) {
    let method: types.KnownKeys<EthereumApi>;
    let params: any;
    let response: Promise<{}>;
    if (typeof arg1 === "string") {
      // this signature is (not) non-standard and is only a ganache thing!!!
      // we should probably remove it, but I really like it so I haven't yet.
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
         process.nextTick(callback, null, JsonRpcTypes.Response(payload.id, JSON.parse(JSON.stringify(result))))
        })
        .catch((error: Error & {code: number, result?: unknown}) => {
          let result: any;
          // In order to provide `vmErrorsOnRPCResponse`, the `error` might have
          // a `result`, which is pretty much just a hack
          if (hasOwn(error, "result")) {
            result = error.result
            delete error.result;
          }
          const errorResult = JsonRpcTypes.Error(payload.id, error, result);
          process.nextTick(callback, error, errorResult);
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
  public sendAsync(payload: JsonRpcTypes.Request<EthereumApi>, callback?: Callback): void {
    return this.send(payload, callback);
  }

  public request<Method extends types.KnownKeys<EthereumApi>>(request: Parameters<EthereumApi[Method]>["length"] extends 0 ? {method: Method} : never): mergePromiseGenerics<ReturnType<EthereumApi[Method]>>;
  public request<Method extends types.KnownKeys<EthereumApi>>(request: RequestParams<Method>): mergePromiseGenerics<ReturnType<EthereumApi[Method]>>;
  public request<Method extends types.KnownKeys<EthereumApi>>(request: RequestParams<Method>) {
    return this.requestRaw(request).then(r => r.value).then(v => JSON.parse(JSON.stringify(v)));
  }

  public async requestRaw<Method extends types.KnownKeys<EthereumApi>>({method, params}: RequestParams<Method>) {
    const result = await this.#executor.execute(this.#api, method, params);
    const promise = (result.value as mergePromiseGenerics<typeof result.value>);
    if (promise instanceof PromiEvent) {
      promise.on("message", (data) => {
        // EIP-1193
        this.emit(("message" as never), (data as never));
        // legacy
        this.emit(("data" as never), ({
          jsonrpc: "2.0",
          method: "eth_subscription",
          params: (data as any).data
        } as never));
      });
    }
    const value = promise.catch((err: Error) => {
      // reformat errors, yo. this is all horrible...
      (err as any).code = -32000;
      if (this.#options.vmErrorsOnRPCResponse && (err as any).result) {
        (err as any).result = JSON.parse(JSON.stringify((err as any).result));
      }
      // then rethrow
      throw err;
    });
    return { value: value };
  }

  public disconnect = async () => {
    await this.emit("disconnect");
    return;
  };
}
