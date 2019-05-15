import { Quantity, Data } from "./types/json-rpc";
import Engine from "./engine";
import RequestProcessor from "./utils/request-processor";
import ProviderOptions, { getDefault as getDefaultProviderOptions } from "./options/provider-options";
import Emittery from "emittery";
import Ethereum from "./ledgers/ethereum/ledger"
import { privateToAddress } from "ethereumjs-util";
import Account from "./types/account";
import { mnemonicToSeedSync } from "bip39";
import Address from "./types/address";
import JsonRpc from "./servers/utils/jsonrpc";
import EthereumOptions from "./ledgers/ethereum/options";

const hdkey = require("ethereumjs-wallet/hdkey");

export type ProviderOptions = ProviderOptions;

const WEI = 1000000000000000000n;

const options = Symbol("options");
const requestProcessor = Symbol("requestProcessor");

interface Callback {
  (err?: Error, response?: JsonRpc.Response): void;
}


export default class Provider extends Emittery {
  private [options]: ProviderOptions;
  private _engine: Engine;
  private [requestProcessor]: RequestProcessor;

  private wallet:any;
  constructor(providerOptions?: ProviderOptions) {
    super();
    const _providerOptions = this[options] = getDefaultProviderOptions(providerOptions);

    // set up our request processor to either use FIFO or or async request processing
    const _requestProcessor = this[requestProcessor] = new RequestProcessor(_providerOptions.asyncRequestProcessing ? 0 : 1);

    this.wallet = hdkey.fromMasterSeed(mnemonicToSeedSync(_providerOptions.mnemonic, null));

    const accounts = this.initializeAccounts();
    // ethereum options' `accounts` are different than the provider options'
    // `accounts`, fix that up here:
    const ethereumOptions = _providerOptions as any as EthereumOptions;
    ethereumOptions.accounts = accounts;
    const emitter = this as any;
    const ledger = _providerOptions.ledger || new Ethereum(ethereumOptions, emitter);
    emitter.on("ready", _requestProcessor.resume.bind(_requestProcessor));
    this._engine = new Engine(ledger);
  }

  // TODO: this doesn't seem like a provider-level function. Maybe we should
  // move this into the Ledger or it's Blockchain?
  private initializeAccounts(): Account[]{
    const _providerOptions = this[options];
    const etherInWei = Quantity.from(Quantity.from(_providerOptions.default_balance_ether).toBigInt() * WEI);
    let accounts: Account[];

    let givenAccounts = _providerOptions.accounts;
    let accountsLength;
    if (givenAccounts && (accountsLength = givenAccounts.length) !== 0) {
      const wallet = this.wallet;
      const hdPath = this[options].hdPath;
      accounts = Array(accountsLength);
      for (let i = 0; i < accountsLength; i++) {
        const account = givenAccounts[i];
        const secretKey = account.secretKey;
        let secretKeyData;
        let address: Address;
        if (!secretKey) {
          const acct = wallet.derivePath(hdPath + i);
          const accountWallet = acct.getWallet();
          address = Address.from(accountWallet.getAddress());
          secretKeyData = Data.from(accountWallet.getPrivateKey());
        } else {
          secretKeyData = Data.from(secretKey);
        }
        accounts[i] = this.createAccount(Quantity.from(account.balance), secretKeyData, address);
      }
    } else {
      const numerOfAccounts =_providerOptions.total_accounts;
      if (numerOfAccounts) {
        accounts = Array(numerOfAccounts);
        const hdPath = this[options].hdPath;
        const wallet = this.wallet;

        for (let index = 0; index < numerOfAccounts; index++) {
          const acct = wallet.derivePath(hdPath + index);
          const accountWallet = acct.getWallet();
          const address = Address.from(accountWallet.getAddress());
          const privateKey = Data.from(accountWallet.getPrivateKey());
          accounts[index] = this.createAccount(etherInWei, privateKey, address);
        }
      } else {
        throw new Error("Cannot initialize chain: either options.accounts or options.total_accounts must be specified");
      }
    }
    return accounts;
  }
  
  // TODO: this should probable be moved as well (see `initializeAccounts` above)
  private createAccount(balance: Quantity, privateKey: Data, address?: Address) {
    address = address || Address.from(privateToAddress(privateKey.toBuffer()));
  
    const account = new Account(address);
    account.privateKey = privateKey;
    account.balance = balance;
  
    return account;
  }

  public send(payload: JsonRpc.Request, callback?: Callback): void;
  public send(method: string, params?: any[]): Promise<any>;
  public send(arg1: string | JsonRpc.Request, arg2?: Callback | any[]): Promise<any> {
    let method: string;
    let params: any[];
    let response: Promise<{}>;
    const engine = this._engine;
    const execute = engine.execute.bind(engine);
    if (typeof arg1 === "string") {
      method = arg1;
      params = arg2 as any[];
      response = this[requestProcessor].queue(execute, method, params).then((result => {
        // convert to JSON
        return JSON.parse(JSON.stringify(result));
      }));
    } else if (typeof arg2 === "function") {
      // handle backward compatibility with callback-style ganache-core
      const payload = arg1 as JsonRpc.Request;
      const callback = arg2 as Callback;
      method = payload.method;
      params = payload.params;

      this[requestProcessor].queue(execute, method, params).then((result) => {
        callback(null, JsonRpc.Response(
          payload.id, 
          JSON.parse(JSON.stringify(result))
        ));
      }).catch(callback);
    }
    else {
      throw new Error(
        "No callback provided to provider's send function. As of web3 1.0, provider.send " +
        "is no longer synchronous and must be passed a callback as its final argument."
      );
    }

    const _options = this[options];
    if (_options.verbose) {
      _options.logger.log(`   >  ${method}: ${params == null ? params : JSON.stringify(params, null, 2).split("\n").join("\n   > ")}`);
    }

    return response;
  }

  /**
   * Legacy callback style API
   * @param payload JSON-RPC payload
   * @param callback callback
   */
  public sendAsync(payload: JsonRpc.Request, callback?: Callback): void {
    return this.send(payload, callback);
  }

  public async close() {
    // wait for anything that subscribed to this close event (like the ledger)
    // to finish before returning

    // stop accepting new requests
    this[requestProcessor].pause();

    await this.emit("close");
    return;
  }
}
