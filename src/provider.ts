import Engine from "./engine";
import RequestProcessor from "./utils/request-processors";
import _ProviderOptions from "./options/provider-options";
import { EventEmitter } from "events";
import {Provider as _Provider} from "ethereum-protocol";

export type ProviderOptions = _ProviderOptions;
export const ProviderOptions = _ProviderOptions;

/**
 * 
 */
export default class Provider extends EventEmitter implements _Provider {
  private options: ProviderOptions;
  private engine: Engine;
  private requestProcessor: RequestProcessor;
  constructor(options: ProviderOptions) {
    super();
    this.options = options;

    // set up our request processor to either use FIFO or or async requst processing
    this.requestProcessor = new RequestProcessor(options.asyncRequestProcessing ? 1 : 0);
  }

  public async send(payload: object, callback?: (err: Error, response?: any) => void): Promise<any> {
    const _send = this.sendAsync(payload);
    if (callback) {
      _send.catch(callback).then(callback.bind(this, null));
      return;
    }
    else {
      return await _send;
    }
  }

  public async sendAsync(payload: Array<any>|object) {
    if (this.options.verbose) {
      this.options.logger.log("   > " + JSON.stringify(payload, null, 2).split("\n").join("\n   > "));
    }

    this.requestProcessor.queue(this.engine.send, payload);
  }
}
