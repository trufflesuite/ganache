import {Quantity, Data} from "@ganache/utils/src/things/json-rpc";
import {ProviderOptions} from "@ganache/options";
import Emittery from "emittery";
import EthereumApi from "./api";
import {privateToAddress} from "ethereumjs-util";
import Account from "./things/account";
import {mnemonicToSeedSync} from "bip39";
import Address from "./things/address";
import JsonRpc from "@ganache/utils/src/things/jsonrpc";
import EthereumOptions from "./options";
import cloneDeep from "lodash.clonedeep";
import secp256k1 from "secp256k1";
import HDKey from "hdkey";
import {types, utils} from "@ganache/utils";
import PromiEvent from "@ganache/utils/src/things/promievent";
const createKeccakHash = require("keccak");

const uncompressedPublicKeyToAddress = (uncompressedPublicKey: Buffer) => {
  const compresedPublicKey = secp256k1.publicKeyConvert(uncompressedPublicKey, false).slice(1);
  const hasher = createKeccakHash("keccak256");
  hasher._state.absorb(compresedPublicKey);
  return Address.from(hasher.digest().slice(-20));
}

const WEI = 1000000000000000000n;

interface Callback {
  (err?: Error, response?: JsonRpc.Response): void;
}

export default class EthereumProvider extends Emittery.Typed<undefined, "message" | "connect" | "disconnect">
  implements types.Provider<EthereumApi>
  {
  #options: ProviderOptions;
  #api: EthereumApi;
  #wallet: HDKey;
  #executor: utils.Executor;

  constructor(providerOptions: ProviderOptions = null, executor: utils.Executor) {
    super();
    const _providerOptions = (this.#options = ProviderOptions.getDefault(providerOptions));

    this.#wallet = HDKey.fromMasterSeed(mnemonicToSeedSync(_providerOptions.mnemonic, null));
    this.#executor = executor;

    const accounts = this.#initializeAccounts();
    // ethereum options' `accounts` are different than the provider options'
    // `accounts`, fix that up here:
    const ethereumOptions = _providerOptions as (ProviderOptions | EthereumOptions);
    ethereumOptions.accounts = accounts;
    this.#api = new EthereumApi(ethereumOptions as EthereumOptions, this);
  }

  // TODO: this doesn't seem like a provider-level function. Maybe we should
  // move this into the Ledger or its Blockchain?
  #initializeAccounts = (): Account[] => {
    const _providerOptions = this.#options;
    const etherInWei = Quantity.from(Quantity.from(_providerOptions.default_balance_ether).toBigInt() * WEI);
    let accounts: Account[];

    let givenAccounts = _providerOptions.accounts;
    let accountsLength;
    if (givenAccounts && (accountsLength = givenAccounts.length) !== 0) {
      const wallet = this.#wallet;
      const hdPath = this.#options.hdPath;
      accounts = Array(accountsLength);
      for (let i = 0; i < accountsLength; i++) {
        const account = givenAccounts[i];
        const secretKey = account.secretKey;
        let privateKey;
        let address: Address;
        if (!secretKey) {
          const acct = wallet.derive(hdPath + i);
          address = uncompressedPublicKeyToAddress(acct.publicKey);
          privateKey = Data.from(acct.privateKey);
        } else {
          privateKey = Data.from(secretKey);
        }
        accounts[i] = EthereumProvider.createAccount(Quantity.from(account.balance), privateKey, address);
      }
    } else {
      const numerOfAccounts = _providerOptions.total_accounts;
      if (numerOfAccounts) {
        accounts = Array(numerOfAccounts);
        const hdPath = this.#options.hdPath;
        const wallet = this.#wallet;

        for (let index = 0; index < numerOfAccounts; index++) {
          const acct = wallet.derive(hdPath + index);
          const address = uncompressedPublicKeyToAddress(acct.publicKey);
          const privateKey = Data.from(acct.privateKey);
          accounts[index] = EthereumProvider.createAccount(etherInWei, privateKey, address);
        }
      } else {
        throw new Error("Cannot initialize chain: either options.accounts or options.total_accounts must be specified");
      }
    }
    return accounts;
  };

  // TODO: this should probable be moved as well (see `initializeAccounts` above)
  static createAccount(balance: Quantity, privateKey: Data, address?: Address) {
    address = address || Address.from(privateToAddress(privateKey.toBuffer()));

    const account = new Account(address);
    account.privateKey = privateKey;
    account.balance = balance;

    return account;
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
      response = this.request(method, params);
    } else if (typeof arg2 === "function") {
      // handle backward compatibility with callback-style ganache-core
      const payload = arg1;
      const callback = arg2 as Callback;
      method = payload.method as types.KnownKeys<EthereumApi>;
      params = payload.params;

      this.request(method, params)
        .then((result: any) => {
          // execute the callback on the nextTick so errors thrown in the callback
          // don't cause the error to buble up to ganache-core
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

  public request<Method extends types.KnownKeys<EthereumApi> = types.KnownKeys<EthereumApi>>(method: Parameters<EthereumApi[Method]>["length"] extends 0 ? Method : never): any; // ReturnType<EthereumApi[Method]>;
  public request<Method extends types.KnownKeys<EthereumApi> = types.KnownKeys<EthereumApi>>(method: Method, params: Parameters<EthereumApi[Method]>): any; // ReturnType<EthereumApi[Method]>;
  public request<Method extends types.KnownKeys<EthereumApi> = types.KnownKeys<EthereumApi>>(method: Method, params?: Parameters<EthereumApi[Method]>) {
    return this.#executor.execute(this.#api, method, params).then(result => {
      const promise = result.value as PromiseLike<ReturnType<EthereumApi[Method]>>;
      if (promise instanceof PromiEvent) {
        promise.on("message", (data) => {
          // EIP-1193
          this.emit("message" as never, data as never);
          // legacy
          this.emit("data" as never, {
            jsonrpc:"2.0",
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
