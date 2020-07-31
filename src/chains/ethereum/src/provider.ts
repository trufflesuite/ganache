import Emittery from "emittery";
import EthereumApi from "./api";
import {JsonRpcTypes} from "@ganache/utils";
import {EthereumOptions} from "@ganache/options";
import cloneDeep from "lodash.clonedeep";
import {PromiEvent, types, utils} from "@ganache/utils";
import {Quantity} from "@ganache/utils";
import {entropyToMnemonic} from "bip39";
import seedrandom, {seedrandom_prng} from "seedrandom";

interface Callback {
  (err?: Error, response?: JsonRpcTypes.Response): void;
}

type RequestParams<Method extends types.KnownKeys<EthereumApi>> = {
  readonly method: Method, readonly params: Parameters<EthereumApi[Method]> | undefined
};

export default class EthereumProvider extends Emittery.Typed<{message: any}, "connect" | "disconnect">
  implements types.Provider<EthereumApi>
  {
  #options: EthereumOptions;
  #api: EthereumApi;
  #executor: utils.Executor;

  constructor(providerOptions: EthereumOptions , executor: utils.Executor) {
    super();
    const _providerOptions = (this.#options = getDefault(providerOptions));
    this.#executor = executor;

    this.#api = new EthereumApi(_providerOptions as EthereumOptions, this);
  }

  /**
   * Returns the options, including defaults and generated, used to start Ganache.
   */
  public getOptions() {
    return cloneDeep(this.#options);
  }

  public send(payload: JsonRpcTypes.Request<EthereumApi>, callback?: Callback): void;
  public send(method: types.KnownKeys<EthereumApi>, params?: Parameters<EthereumApi[typeof method]>): Promise<any>;
  public send(arg1: types.KnownKeys<EthereumApi> | JsonRpcTypes.Request<EthereumApi>, arg2?: Callback | any[]): Promise<any> {
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
         process.nextTick(callback, null, JsonRpcTypes.Response(payload.id, JSON.parse(JSON.stringify(result))))
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
  public sendAsync(payload: JsonRpcTypes.Request<EthereumApi>, callback?: Callback): void {
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



function randomBytes(length: number, rng: () => number) {
  const buf = Buffer.allocUnsafe(length);
  for (let i = 0; i < length; i++) {
    buf[i] = (rng() * 255) | 0;
  }
  return buf;
}

const randomAlphaNumericString = (() => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const alphabetLength = alphabet.length;
  return (length: number, rng: () => number) => {
    let text = "";
    for (let i = 0; i < length; i++) {
      text += alphabet[(rng() * alphabetLength) | 0];
    }

    return text;
  };
})();

function getDefault(options?: Partial<EthereumOptions>):EthereumOptions {
  const networkId = (options
    ? options.networkId || options.netVersion || options.network_id || options.net_version || Date.now()
    : Date.now()
  ).toString();
  const chainId = options ? options.chainId || 1337 : 1337;
  const secure = options ? options.secure || options.locked || false : false;

  let finalOptions = {} as EthereumOptions;

  Object.assign(finalOptions, 
    {
      chainId,
      debug: false,
      logger: {log: () => {}},
      default_balance_ether: 100n,
      total_accounts: 10n,
      networkId,
      vmErrorsOnRPCResponse: true,
      hdPath: "m/44'/60'/0'/0/",
      allowUnlimitedContractSize: false,
      gasPrice: new Quantity(2000000000),
      gasLimit: new Quantity(6721975),
      defaultTransactionGasLimit: new Quantity(90000),
      callGasLimit: new Quantity(Number.MAX_SAFE_INTEGER),
      verbose: false,
      asyncRequestProcessing: true,
      hardfork: "muirGlacier",
      secure
    },
    options
  );

  if (!options.mnemonic) {
    let rng: seedrandom_prng;
    let seed = finalOptions.seed;
    if (!seed) {
      // do this so that we can use the same seed on our next run and get the same
      // results without explicitly setting a seed up front.
      // Use the alea PRNG for its extra speed.
      rng = seedrandom.alea as seedrandom_prng;
      seed = finalOptions.seed = randomAlphaNumericString(10, rng());
    } else {
      // Use the default seedrandom PRNG for ganache-core < 3.0 back-compatibility
      rng = seedrandom;
    }
    // generate a randomized default mnemonic
    const _randomBytes = randomBytes(16, rng(seed));
    finalOptions.mnemonic = entropyToMnemonic(_randomBytes);
  }

  return finalOptions;
}