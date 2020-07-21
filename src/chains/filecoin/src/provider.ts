import {ProviderOptions} from "@ganache/options";
import Emittery from "emittery";
import {types, utils} from "@ganache/utils";
import PromiEvent from "@ganache/utils/src/things/promievent";
import FilecoinApi from "./api";

// Meant to mimic this provider: 
// https://github.com/filecoin-shipyard/js-lotus-client-provider-browser
export default class FilecoinProvider extends Emittery.Typed<undefined, "message" | "connect" | "disconnect"> 
  // Do I actually need this? `types.Provider` doesn't actually define anything behavior
  implements types.Provider<FilecoinApi>
  {

  #options: ProviderOptions;
  #api: FilecoinApi;
  #executor: utils.Executor;

  constructor(providerOptions: ProviderOptions = null, executor: utils.Executor) {
    super();
    this.#options = ProviderOptions.getDefault(providerOptions);

    this.#executor = executor;
    this.#api = new FilecoinApi({}, this);
  }

  async connect () {
    throw new Error("I have no idea if I need this (connect).");
  }

  async send () {
    throw new Error("I probably need this one, but am not sure yet. (send)");
  }

  async sendHttp () {
    throw new Error("I have no idea if I need this. (sendHttp)");
  }

  async sendWs () {
    throw new Error("I have no idea if I need this. (sendWs)");
  }

  async sendSubscription () {
    throw new Error("I have no idea if I need this. (sendSubscription)");
  }

  async receive () {
    throw new Error("I have no idea if I need this. (receive)");
  }

  async import () {
    throw new Error("I have no idea if I need this. (import)");
  }

  async destroy () {
    throw new Error("I have no idea if I need this. (destroy)");
  }

  public request<Method extends types.KnownKeys<FilecoinApi> = types.KnownKeys<FilecoinApi>>(method: Parameters<FilecoinApi[Method]>["length"] extends 0 ? Method : never): any; // ReturnType<FilecoinApi[Method]>;
  public request<Method extends types.KnownKeys<FilecoinApi> = types.KnownKeys<FilecoinApi>>(method: Method, params: Parameters<FilecoinApi[Method]>): any; // ReturnType<FilecoinApi[Method]>;
  public request<Method extends types.KnownKeys<FilecoinApi> = types.KnownKeys<FilecoinApi>>(method: Method, params?: Parameters<FilecoinApi[Method]>) {
    console.log(method);
    
    return this.#executor.execute(this.#api, method, params).then(result => {
      console.log(result);
      return result;
    }).then(JSON.stringify).then(JSON.parse);
  }
}