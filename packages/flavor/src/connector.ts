import { Api, KnownKeys } from "@ganache/utils";
import {
  RecognizedString,
  WebSocket,
  HttpRequest
} from "@trufflesuite/uws-js-unofficial";

export type { WebSocket, HttpRequest } from "@trufflesuite/uws-js-unofficial";

/**
 * Connects an arbitrary public chain provider to ganache
 */
export interface Connector<Provider, RequestFormat, ResponseFormat> {
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
      ) => Promise<{ value: unknown }>)
    | ((
        payload: RequestFormat[],
        connection: HttpRequest
      ) => Promise<{ value: unknown[] }>)
    | ((
        payload: RequestFormat,
        connection: WebSocket<void>
      ) => Promise<{ value: unknown }>)
    | ((
        payload: RequestFormat[],
        connection: WebSocket<void>
      ) => Promise<{ value: unknown[] }>);

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

  close(): void | Promise<void>;
}

export interface WebsocketConnector<Provider, RequestFormat, ResponseFormat>
  extends Connector<Provider, RequestFormat, ResponseFormat> {
  handle(
    payload: RequestFormat,
    connection: WebSocket<void>
  ): Promise<{ value: ReturnType<Api[KnownKeys<Api>]> }>;
}
