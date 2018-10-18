import _ProviderOptions from "./options/provider-options";
import { EventEmitter } from "events";

export type ProviderOptions = _ProviderOptions;
export const ProviderOptions = _ProviderOptions;

/**
 * 
 */
export default class Provider extends EventEmitter {
  public options: Object;
  constructor(options: ProviderOptions) {
    super();
    this.options = options;
  }
  public async send(payload: Object, callback?: (err: Error, response: any) => void): Promise<any> {
    if (!callback) {
      return new Promise((resolve, reject) => {
        resolve({});
      });
    }
    return;
  }
}
