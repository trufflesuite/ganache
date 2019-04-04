import Engine from "./engine";
import RequestProcessor from "./utils/request-processor";
import ProviderOptions, { getDefault as getDefaultProviderOptions } from "./options/provider-options";
import { EventEmitter } from "events";
import Ethereum from "./ledgers/ethereum/ledger"
import utils from "ethereumjs-util";
import Account from "./types/account";
const bip39 = require("bip39");
import { JsonRpcQuantity, JsonRpcData } from "./types/json-rpc";
import Address from "./types/address";
import JsonRpc from "./servers/utils/jsonrpc";

const hdkey = require("ethereumjs-wallet/hdkey");

export type ProviderOptions = ProviderOptions;

const options = Symbol("options");
const engine = Symbol("engine");
const requestProcessor = Symbol("requestProcessor");

interface Callback {
  (err?: Error, response?: JsonRpc.Response): void;
}


export default class Provider extends EventEmitter {
  private [options]: ProviderOptions;
  private [engine]: Engine;
  private [requestProcessor]: RequestProcessor;

  private wallet:any;
  private hdPath:string;
  constructor(providerOptions?: ProviderOptions) {
    super();
    const _providerOptions = this[options] = getDefaultProviderOptions(providerOptions);

    // set up our request processor to either use FIFO or or async request processing
    this[requestProcessor] = new RequestProcessor(_providerOptions.asyncRequestProcessing ? 1 : 0);

    if(!_providerOptions.mnemonic){
      // TODO: this is a default and should be configured that way
      _providerOptions.mnemonic = bip39.generateMnemonic();
    }
    this.wallet = hdkey.fromMasterSeed(bip39.mnemonicToSeedSync(_providerOptions.mnemonic, null));

    const accounts = this.initializeAccounts();
    const net_version = _providerOptions.network_id.toString();
    const _engine = this[engine] = new Engine(_providerOptions.ledger || new Ethereum({
      net_version,
      accounts
    }));
  }
  private initializeAccounts(): Account[]{
    const _providerOptions = this[options];
    let accounts: Account[];

    if (_providerOptions.accounts) {
      accounts = _providerOptions.accounts.map((account) => {
        return this.createAccount(account.balance, account.privateKey, account.address);
      });
    } else if(_providerOptions.total_accounts) {
      accounts = [];
      const hdPath = this[options].hdPath;
      const wallet = this.wallet;

      const ether = JsonRpcQuantity.from(_providerOptions.default_balance_ether);
      for (let index = 0; index < _providerOptions.total_accounts; index++) {
        const acct = wallet.derivePath(hdPath + index);
        const accountWallet = acct.getWallet();
        const address = Address.from(accountWallet.getAddress());
        const privateKey = JsonRpcData.from(accountWallet.getPrivateKey());
        accounts.push(this.createAccount(ether, privateKey, address));
      }
    } else {
      throw new Error("Cannot initialize chain: either options.accounts or options.total_accounts must be specified");
    }
    return accounts;
  }
  private createAccount(balance: JsonRpcQuantity, privateKey: JsonRpcData, address?: Address) {
    address = address || Address.from(utils.privateToAddress(Buffer.from(privateKey.toString(), "hex")));
  
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
    const _engine = this[engine];
    const execute = _engine.execute.bind(_engine);
    switch (typeof arg1) {
      case "string": {
        method = arg1;
        params = arg2 as any[];
        response = this[requestProcessor].queue(execute, method, params).then((result => {
          // convert to JSON
          return JSON.parse(JSON.stringify(result));
        }));
      }
      break;
      case "function": {
        // handle backward compatibility with callback-style ganache-core
        const callback = arg2 as Callback;
        const payload = arg1 as JsonRpc.Request;
        method = payload.method;
        params = payload.params;

        this[requestProcessor].queue(execute, method, params).then((result) => {
          callback(null, JsonRpc.Response(
            payload.id, 
            JSON.parse(JSON.stringify(result))
          ));
        }).catch(callback);
      }
      break;
    default:
      throw new Error(
        "No callback provided to provider's send function. As of web3 1.0, provider.send " +
        "is no longer synchronous and must be passed a callback as its final argument."
      );
    }

    const _options = this[options];
    if (_options.verbose) {
      _options.logger.log(`   >  ${method}: ${JSON.stringify(params, null, 2).split("\n").join("\n   > ")}`);
    }

    return response;
  }

  public sendAsync(payload: JsonRpc.Request, callback?: Callback): void {
    return this.send(payload, callback);
  }
}
