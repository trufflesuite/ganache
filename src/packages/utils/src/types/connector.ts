import { Provider } from "./provider";
import { RecognizedString, WebSocket, HttpRequest } from "uWebSockets.js";
import { Api } from "./api";
import { KnownKeys } from "../types";
import Emittery from "emittery";

/**
 * Connects an arbitrary public chain provider to ganache-core
 */
export interface Connector<
  ApiImplementation extends Api,
  RequestFormat,
  ResponseFormat
> extends Emittery.Typed<undefined, "ready" | "close"> {
  provider: Provider<ApiImplementation>;

  /**
   * Parses a raw message into something that can be handled by `handle`
   * @param message
   */
  parse(message: Buffer): RequestFormat;

  /**
   * Handles a parsed message
   * @param payload
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
   * @param response
   * @param payload
   */
  format(result: ResponseFormat, payload: RequestFormat): RecognizedString;

  /**
   * Formats the error response
   * @param error
   * @param payload
   */
  formatError(error: Error, payload: RequestFormat): RecognizedString;

  close(): void;
}
