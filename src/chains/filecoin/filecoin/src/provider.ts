import Emittery from "emittery";
import { types, utils } from "@ganache/utils";
import JsonRpc from "@ganache/utils/src/things/jsonrpc";
import FilecoinApi from "./api";
import GanacheSchema from "./schema";
import { Schema } from "@filecoin-shipyard/lotus-client-schema";
import Blockchain from "./blockchain";
import {
  FilecoinOptionsConfig,
  FilecoinProviderOptions
} from "@ganache/filecoin-options";

// Meant to mimic this provider:
// https://github.com/filecoin-shipyard/js-lotus-client-provider-browser
export default class FilecoinProvider
  extends Emittery.Typed<undefined, "ready">
  // Do I actually need this? `types.Provider` doesn't actually define anything behavior
  implements types.Provider<FilecoinApi> {
  #options: FilecoinProviderOptions;
  #api: FilecoinApi;
  #executor: utils.Executor;

  readonly blockchain: Blockchain;

  // Used by the original Filecoin provider. Will mimic them for now.
  // Not entirely sure they're needed.
  #connectPromise: PromiseLike<never>;

  static readonly Schema: Schema = GanacheSchema;

  constructor(options: FilecoinProviderOptions = {}, executor: utils.Executor) {
    super();
    const providerOptions = (this.#options = FilecoinOptionsConfig.normalize(
      options as FilecoinProviderOptions
    ));

    this.#executor = executor;

    this.blockchain = new Blockchain(providerOptions);
    this.blockchain.on("ready", () => {
      this.emit("ready");
    });

    this.#api = new FilecoinApi(this.blockchain);
  }

  async connect() {
    if (this.#connectPromise) {
      this.#connectPromise = new Promise(resolve => {
        resolve(void 0);
      });
    }
    return this.#connectPromise;
  }

  async send<Method extends keyof FilecoinApi = keyof FilecoinApi>(
    payload: JsonRpc.Request<FilecoinApi>
  ) {
    // I'm not entirely sure why I need the `as [string]`... but it seems to work.
    return this.#executor
      .execute(this.#api, payload.method, payload.params as [string])
      .then(result => {
        const promise = (result.value as unknown) as PromiseLike<
          ReturnType<FilecoinApi[Method]>
        >;

        return promise.then(JSON.stringify).then(JSON.parse);
      });
  }

  async sendHttp() {
    throw new Error("Method not supported (sendHttp)");
  }

  async sendWs() {
    throw new Error("Method not supported (sendWs)");
  }

  async sendSubscription() {
    throw new Error("Method not supported (sendSubscription)");
  }

  async receive() {
    throw new Error("Method not supported (receive)");
  }

  async import() {
    throw new Error("Method not supported (import)");
  }

  async destroy() {
    throw new Error("Method not supported (destroy)");
  }

  async stop() {
    await this.#api.stop();
  }
}
