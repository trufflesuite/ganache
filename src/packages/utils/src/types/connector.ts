import {
  RecognizedString,
  WebSocket,
  HttpRequest
} from "@trufflesuite/uws-js-unofficial";
import { Api } from "./api";
import { KnownKeys } from "../types";
import Emittery from "emittery";
import { Executor } from "../utils";

export type { HttpRequest } from "@trufflesuite/uws-js-unofficial";

export interface ConnectorConstructor<Provider, RequestFormat, ResponseFormat> {
  new (
    providerOptions: Partial<
      Record<string, unknown | Partial<Record<string, unknown>>>
    > | null,
    executor: Executor
  ): Connector<Provider, RequestFormat, ResponseFormat>;
}

/**
 * Connects an arbitrary public chain provider to ganache
 */
export interface Connector<Provider, RequestFormat, ResponseFormat>
  extends Emittery<{ ready: undefined; close: undefined }> {
  provider: Provider;

  /**
   * Instructs the connector to initialize its internal components. Must return
   * a promise that resolves once it has fully started, or reject if it couldn't
   * start.
   */
  connect: () => Promise<void>;

  /**
   * Parses a raw message into something that can be handled by `handle`
   * @param message -
   */
  parse(message: Buffer): RequestFormat;

  /**
   * Handles a parsed message
   * @param payload -
   */
  handle:
    | ((
        payload: RequestFormat,
        connection: HttpRequest
      ) => Promise<{ value: ReturnType<Api[KnownKeys<Api>]> }>)
    | ((
        payload: RequestFormat[],
        connection: HttpRequest
      ) => Promise<{ value: ReturnType<Api[KnownKeys<Api>]>[] }>)
    | ((
        payload: RequestFormat,
        connection: WebSocket
      ) => Promise<{ value: ReturnType<Api[KnownKeys<Api>]> }>)
    | ((
        payload: RequestFormat[],
        connection: WebSocket
      ) => Promise<{ value: ReturnType<Api[KnownKeys<Api>]>[] }>);

  /**
   * Formats the response (returned from `handle`)
   * @param response -
   * @param payload -
   */
  format(
    result: ResponseFormat,
    payload: RequestFormat
  ): RecognizedString | Generator<RecognizedString>;
  format(result: ResponseFormat, payload: RequestFormat): RecognizedString;

  /**
   * Formats the error response
   * @param error -
   * @param payload -
   */
  formatError(error: Error, payload: RequestFormat): RecognizedString;

  close(): void;
}

export interface WebsocketConnector<Provider, RequestFormat, ResponseFormat>
  extends Connector<Provider, RequestFormat, ResponseFormat> {
  handle(
    payload: RequestFormat,
    connection: WebSocket
  ): Promise<{ value: ReturnType<Api[KnownKeys<Api>]> }>;
}
