/// <reference types="node" />
import Emittery from "emittery";
import FilecoinApi from "./api";
import { JsonRpcTypes, types, utils } from "@ganache/utils";
import FilecoinProvider from "./provider";
import {
  RecognizedString,
  HttpRequest,
  WebSocket
} from "@seesemichaelj/uwebsockets.js";
import { FilecoinProviderOptions } from "@ganache/filecoin-options";
export declare type Provider = FilecoinProvider;
export declare const Provider: typeof FilecoinProvider;
export declare class Connector
  extends Emittery.Typed<{}, "ready" | "close">
  implements
    types.Connector<
      FilecoinApi,
      JsonRpcTypes.Request<FilecoinApi>,
      JsonRpcTypes.Response
    > {
  #private;
  get provider(): FilecoinProvider;
  constructor(
    providerOptions: FilecoinProviderOptions,
    executor: utils.Executor
  );
  parse(message: Buffer): JsonRpcTypes.Request<FilecoinApi>;
  handle(
    payload: JsonRpcTypes.Request<FilecoinApi>,
    _connection: HttpRequest | WebSocket
  ): Promise<any>;
  format(
    result: any,
    payload: JsonRpcTypes.Request<FilecoinApi>
  ): RecognizedString;
  formatError(
    error: Error & {
      code: number;
    },
    payload: JsonRpcTypes.Request<FilecoinApi>
  ): RecognizedString;
  close(): Promise<void>;
}
