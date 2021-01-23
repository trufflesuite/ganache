import Emittery from "emittery";
import { types, utils } from "@ganache/utils";
import JsonRpc from "@ganache/utils/src/things/jsonrpc";
import FilecoinApi from "./api";
import { Schema } from "@filecoin-shipyard/lotus-client-schema";
import Blockchain from "./blockchain";
import { FilecoinProviderOptions } from "@ganache/filecoin-options";
export default class FilecoinProvider
  extends Emittery.Typed<undefined, "ready">
  implements types.Provider<FilecoinApi> {
  #private;
  readonly blockchain: Blockchain;
  static readonly Schema: Schema;
  constructor(options: FilecoinProviderOptions, executor: utils.Executor);
  /**
   * Returns the options, including defaults and generated, used to start Ganache.
   */
  getOptions(): any;
  /**
   * Returns the unlocked accounts
   */
  getInitialAccounts(): Record<
    string,
    {
      unlocked: boolean;
      secretKey: string;
      balance: bigint;
    }
  >;
  connect(): Promise<never>;
  send<Method extends keyof FilecoinApi = keyof FilecoinApi>(
    payload: JsonRpc.Request<FilecoinApi>
  ): Promise<any>;
  sendHttp(): Promise<void>;
  sendWs(): Promise<void>;
  sendSubscription(): Promise<void>;
  receive(): Promise<void>;
  import(): Promise<void>;
  destroy(): Promise<void>;
  stop(): Promise<void>;
}
