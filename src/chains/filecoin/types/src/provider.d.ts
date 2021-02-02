import Emittery from "emittery";
import { PromiEvent, types, utils } from "@ganache/utils";
import JsonRpc from "@ganache/utils/src/things/jsonrpc";
import FilecoinApi from "./api";
import { Schema } from "@filecoin-shipyard/lotus-client-schema";
import Blockchain from "./blockchain";
import {
  FilecoinProviderOptions,
  FilecoinInternalOptions
} from "@ganache/filecoin-options";
export default class FilecoinProvider
  extends Emittery.Typed<{}, "ready">
  implements types.Provider<FilecoinApi> {
  #private;
  readonly blockchain: Blockchain;
  static readonly Schema: Schema;
  constructor(options: FilecoinProviderOptions, executor: utils.Executor);
  /**
   * Returns the options, including defaults and generated, used to start Ganache.
   */
  getOptions(): FilecoinInternalOptions;
  /**
   * Returns the unlocked accounts
   */
  getInitialAccounts(): Promise<
    Record<
      string,
      {
        unlocked: boolean;
        secretKey: string;
        balance: bigint;
      }
    >
  >;
  connect(): Promise<void>;
  send(payload: JsonRpc.Request<FilecoinApi>): Promise<any>;
  _requestRaw<Method extends keyof FilecoinApi = keyof FilecoinApi>(
    payload: JsonRpc.Request<FilecoinApi>
  ): Promise<
    | {
        value: PromiEvent<any>;
      }
    | {
        value: PromiseLike<ReturnType<FilecoinApi[Method]>>;
      }
  >;
  sendHttp(): Promise<void>;
  sendWs(): Promise<void>;
  sendSubscription(
    payload: JsonRpc.Request<FilecoinApi>,
    schemaMethod: {
      subscription?: boolean;
    },
    subscriptionCallback: (data: any) => void
  ): Promise<(Promise<string> | (() => void))[]>;
  receive(): Promise<void>;
  import(): Promise<void>;
  destroy(): Promise<void>;
  stop(): Promise<void>;
}
