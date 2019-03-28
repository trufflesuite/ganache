import Engine from "./engine";
import RequestProcessor from "./utils/request-processor";
import ProviderOptions, { getDefault as getDefaultProviderOptions } from "./options/provider-options";
import { EventEmitter } from "events";
import Ethereum from "./ledgers/ethereum/ledger"

export type ProviderOptions = ProviderOptions;

const options = Symbol("options");
const engine = Symbol("engine");
const requestProcessor = Symbol("requestProcessor");

interface Payload {
  method: string
  params: any[]
}

interface Callback {
  (err: Error, response?: any): void;
}

export default class Provider extends EventEmitter {
  private [options]: ProviderOptions;
  private [engine]: Engine;
  private [requestProcessor]: RequestProcessor;
  constructor(providerOptions?: ProviderOptions) {
    super();
    const _providerOptions = this[options] = getDefaultProviderOptions(providerOptions);

    // set up our request processor to either use FIFO or or async request processing
    this[requestProcessor] = new RequestProcessor(_providerOptions.asyncRequestProcessing ? 1 : 0);

    this[engine] = new Engine(_providerOptions.ledger || new Ethereum({ net_version: _providerOptions.network_id.toString() }));
  }

  public send(payload: Payload, callback?: Callback): void;
  public send(method: string, params?: any[]): Promise<any>;
  public send(arg1: string | Payload, arg2?: any): Promise<any> {
    let method: string;
    let params: any[];
    let response: Promise<{}>;
    const send = this[engine].send.bind(this[engine]);
    if (typeof arg1 === "string") {
      method = arg1;
      params = arg2;
      response = this[requestProcessor].queue(send, method, params);
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

      this[requestProcessor].queue(send, method, params).then((response: any) => {
        callback(null, {
          id: (arg1 as any).id,
          jsonrpc: "2.0",
          result: response
        });
      }).catch(callback);

      response = undefined;
    }

    if (this[options].verbose) {
      this[options].logger.log(`   >  ${method}: ${JSON.stringify(params, null, 2).split("\n").join("\n   > ")}`);
    }

    return response;
  }

  public sendAsync(payload: Payload, callback?: Callback): void {
    this.send(payload, callback);
  }
}
