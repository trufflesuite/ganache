import Engine from "./engine";
import RequestProcessor from "./utils/request-processor";
import _ProviderOptions from "./options/provider-options";
import { EventEmitter } from "events";
import Ethereum from "./ledgers/ethereum/ethereum"

export type ProviderOptions = _ProviderOptions;
export const ProviderOptions = _ProviderOptions;

interface Payload {
  method: string
  params: Array<any>
}

interface Callback {
  (err: Error, response?: any): void;
}

export default class Provider extends EventEmitter {
  private options: ProviderOptions;
  private engine: Engine;
  private requestProcessor: RequestProcessor;
  constructor(options = new ProviderOptions()) {
    super();
    this.options = options;

    // set up our request processor to either use FIFO or or async request processing
    this.requestProcessor = new RequestProcessor(options.asyncRequestProcessing ? 1 : 0);

    this.engine = new Engine(options.ledger || new Ethereum({networkId: Date.now()}));
  }

  public send(payload: Payload, callback?: Callback): void 
  public async send(method: string, params?: Array<any>): Promise<any>;
  public async send(arg1: string | Payload, arg2?: any): Promise<any> {
    let method: string;
    let params: Array<any>;
    let response: Promise<{}>;
    const send = this.engine.send.bind(this.engine);
    if (typeof arg1 === "string") {
      method = arg1;
      params = arg2;
      response = this.requestProcessor.queue(send, method, params);
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
      
      this.requestProcessor.queue(send, method, params).then((response: any)=>{
        callback(null, response);
      }).catch(callback);
      
      response = undefined;
    }

    if (this.options.verbose) {
      this.options.logger.log(`   >  ${method}: ${JSON.stringify(params, null, 2).split("\n").join("\n   > ")}`);
    }

    return response;
  }

  public sendAsync(payload: Payload, callback?: Callback): void {
    this.send(payload, callback);
  }
}
