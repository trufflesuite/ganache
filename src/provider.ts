import Engine from "./engine";
import RequestProcessor from "./utils/request-processor";
import ProviderOptions, {getDefault as getDefaultProviderOptions} from "./options/provider-options";
import { EventEmitter } from "events";
import Ethereum from "./ledgers/ethereum/ledger"

export type ProviderOptions = ProviderOptions;

interface Payload {
  method: string
  params: Array<any>
}

interface Callback {
  (err: Error, response?: any): void;
}

export default class Provider extends EventEmitter {
  private _options: ProviderOptions;
  private _engine: Engine;
  private _requestProcessor: RequestProcessor;
  constructor(options?: ProviderOptions) {
    super();
    const _options = this._options = getDefaultProviderOptions(options);

    // set up our request processor to either use FIFO or or async request processing
    this._requestProcessor = new RequestProcessor(_options.asyncRequestProcessing ? 1 : 0);

    this._engine = new Engine(_options.ledger || new Ethereum({net_version: _options.network_id.toString()}));
  }

  public send(payload: Payload, callback?: Callback): void 
  public async send(method: string, params?: Array<any>): Promise<any>;
  public async send(arg1: string | Payload, arg2?: any): Promise<any> {
    let method: string;
    let params: Array<any>;
    let response: Promise<{}>;
    const send = this._engine.send.bind(this._engine);
    if (typeof arg1 === "string") {
      method = arg1;
      params = arg2;
      response = this._requestProcessor.queue(send, method, params);
    } else {
      // handle backward compatibility with callback-style ganache-core
      const payload: Payload = arg1 as Payload;
      method = payload.method;
      params = payload.params;
      const callback = arg2;

      if (typeof callback !== "function") {
        throw new Error(
          "No callback provided to provider's send function. As of web3 1.0, provider.send " +
            "is no longer synchronous and must be passed a callback as its final argument."
        );
      }
      
      this._requestProcessor.queue(send, method, params).then((response: any)=>{
        callback(null, response);
      }).catch(callback);
      
      response = undefined;
    }

    if (this._options.verbose) {
      this._options.logger.log(`   >  ${method}: ${JSON.stringify(params, null, 2).split("\n").join("\n   > ")}`);
    }

    return response;
  }

  public sendAsync(payload: Payload, callback?: Callback): void {
    this.send(payload, callback);
  }
}
