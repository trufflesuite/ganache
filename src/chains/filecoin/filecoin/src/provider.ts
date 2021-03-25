import Emittery from "emittery";
import { PromiEvent, Subscription, types, utils } from "@ganache/utils";
import JsonRpc from "@ganache/utils/src/things/jsonrpc";
import FilecoinApi from "./api";
import GanacheSchema from "./schema";
import { Schema } from "@filecoin-shipyard/lotus-client-schema";
import Blockchain from "./blockchain";
import {
  FilecoinOptionsConfig,
  FilecoinProviderOptions,
  FilecoinInternalOptions
} from "@ganache/filecoin-options";
import cloneDeep from "lodash.clonedeep";

// Meant to mimic this provider:
// https://github.com/filecoin-shipyard/js-lotus-client-provider-browser
export default class FilecoinProvider
  extends Emittery.Typed<{}, "ready">
  // Do I actually need this? `types.Provider` doesn't actually define anything behavior
  implements types.Provider<FilecoinApi> {
  #options: FilecoinInternalOptions;
  #api: FilecoinApi;
  #executor: utils.Executor;

  readonly blockchain: Blockchain;

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

  /**
   * Returns the options, including defaults and generated, used to start Ganache.
   */
  public getOptions() {
    return cloneDeep(this.#options);
  }

  /**
   * Returns the unlocked accounts
   */
  public async getInitialAccounts() {
    const accounts: Record<
      string,
      { unlocked: boolean; secretKey: string; balance: bigint }
    > = {};

    const controllableAccounts = await this.blockchain.accountManager!.getControllableAccounts();
    for (const account of controllableAccounts) {
      accounts[account.address.serialize()] = {
        unlocked: true,
        secretKey: account.address.privateKey!,
        balance: account.balance.value
      };
    }

    return accounts;
  }

  async connect() {
    await this.blockchain.waitForReady();
  }

  async send(payload: JsonRpc.Request<FilecoinApi>) {
    const result = await this._requestRaw(payload);
    return result.value;
  }

  async _requestRaw<Method extends keyof FilecoinApi = keyof FilecoinApi>(
    payload: JsonRpc.Request<FilecoinApi>
  ) {
    // The `as any` is needed here because of this hackery of appending the
    // JSON `id` no longer fits within the strictly typed `execute` `params`
    // argument
    const result = await this.#executor.execute(this.#api, payload.method, [
      ...(payload.params || []),
      payload.id
    ] as any);
    const promise = (result.value as unknown) as PromiseLike<
      ReturnType<FilecoinApi[Method]>
    >;

    if (promise instanceof PromiEvent) {
      promise.on("message", data => {
        this.emit("message" as never, data as never);
      });

      const value = await promise;

      if (
        typeof value === "object" &&
        typeof value.unsubscribe === "function"
      ) {
        // since the class instance gets ripped away,
        // we can't use instanceof Subscription, so we
        // just use an interface and check for the unsubscribe
        // function 🤷
        const newPromiEvent = PromiEvent.resolve(value.id);
        promise.on("message", data => {
          newPromiEvent.emit("message" as never, data as never);
        });
        return { value: newPromiEvent };
      }
    }

    return { value: promise };
  }

  async sendHttp() {
    throw new Error("Method not supported (sendHttp)");
  }

  async sendWs() {
    throw new Error("Method not supported (sendWs)");
  }

  // Reference implementation: https://git.io/JtO3H
  async sendSubscription(
    payload: JsonRpc.Request<FilecoinApi>,
    schemaMethod: { subscription?: boolean },
    subscriptionCallback: (data: any) => void
  ) {
    // I'm not entirely sure why I need the `as [string]`... but it seems to work.
    const result = await this.#executor.execute(this.#api, payload.method, [
      ...(payload.params || []),
      payload.id
    ] as any);
    const promiEvent = (result.value as unknown) as PromiEvent<Subscription>;

    if (promiEvent instanceof PromiEvent) {
      promiEvent.on("message", data => {
        subscriptionCallback(data);
      });
    }

    const value = await promiEvent;

    return [value.unsubscribe, Promise.resolve(value.id.toString())];
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
