import {Quantity, Data} from "../../types/json-rpc";
import ProviderOptions, {getDefault as getDefaultProviderOptions} from "../../options/provider-options";
import Emittery from "emittery";
import Ledger from "../../ledgers/ethereum/ledger";
import {publicToAddress, privateToAddress} from "ethereumjs-util";
import Account from "../../types/account";
import {mnemonicToSeedSync} from "bip39";
import Address from "../../types/address";
import JsonRpc from "../../servers/utils/jsonrpc";
import EthereumOptions from "../../ledgers/ethereum/options";
import cloneDeep from "lodash.clonedeep";
import secp256k1 from "secp256k1";
import HDKey from "hdkey";
import {ILedger} from "../../interfaces/base-ledger";
import {IProvider} from "../../interfaces/IProvider";

const WEI = 1000000000000000000n;

interface Callback {
  (err?: Error, response?: JsonRpc.Response): void;
}

type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends {[_ in keyof T]: infer U}
  ? U
  : never;

type RequestType<T extends ILedger = ILedger> = (eventDetails: {
  ledger: T;
  method: KnownKeys<T>;
  params?: Parameters<T[keyof T]>;
}) => ReturnType<T[keyof T]>;

export default class EthereumProvider extends Emittery.Typed<{request: RequestType<Ledger>}, "ready" | "close">
  implements IProvider<Ledger> {
  #options: ProviderOptions;
  #ledger: Ledger;
  #wallet: HDKey;

  constructor(providerOptions?: ProviderOptions) {
    super();
    const _providerOptions = (this.#options = getDefaultProviderOptions(providerOptions));

    this.#wallet = HDKey.fromMasterSeed(mnemonicToSeedSync(_providerOptions.mnemonic, null));

    const accounts = this.#initializeAccounts();
    // ethereum options' `accounts` are different than the provider options'
    // `accounts`, fix that up here:
    const ethereumOptions = (_providerOptions as any) as EthereumOptions;
    ethereumOptions.accounts = accounts;
    const emitter = this as any;
    this.#ledger = new Ledger(ethereumOptions, emitter);
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
          const publicKey = secp256k1.publicKeyConvert(acct.publicKey as Buffer, false).slice(1);
          address = Address.from(publicToAddress(publicKey));
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
          const publicKey = secp256k1.publicKeyConvert(acct.publicKey as Buffer, false).slice(1);
          const address = Address.from(publicToAddress(publicKey));
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

  public getOptions() {
    return cloneDeep(this.#options);
  }

  public send(payload: JsonRpc.Request<Ledger>, callback?: Callback): void;
  public send(method: KnownKeys<Ledger>, params?: any[]): Promise<any>;
  public send(arg1: KnownKeys<Ledger> | JsonRpc.Request<Ledger>, arg2?: Callback | any[]): Promise<any> {
    let method: KnownKeys<Ledger>;
    let params: any[];
    let response: Promise<{}>;
    if (typeof arg1 === "string") {
      method = arg1;
      params = arg2 as any[];
      response = this.request(method, params);
    } else if (typeof arg2 === "function") {
      // handle backward compatibility with callback-style ganache-core
      const payload = arg1;
      const callback = arg2 as Callback;
      method = payload.method as KnownKeys<Ledger>;
      params = payload.params;

      this.emit("request", {ledger: this.#ledger, method, params})
        .then(
          ([result]) =>
            void process.nextTick(callback, null, JsonRpc.Response(payload.id, JSON.parse(JSON.stringify(result))))
        )
        .catch(err => void process.nextTick(callback, err));
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
  public sendAsync(payload: JsonRpc.Request<Ledger>, callback?: Callback): void {
    return this.send(payload, callback);
  }

  public request(method: KnownKeys<Ledger>, params?: any[]): Promise<any> {
    return this.emit("request", {ledger: this.#ledger, method, params}).then(([result]) => {
      // we convert to a string and then back to JSON to create a quick deep
      // copy or the result values.
      return JSON.parse(JSON.stringify(result));
    });
  }

  public close = async () => {
    await this.emit("close");
    return;
  };
}
