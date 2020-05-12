import {Provider} from "./provider";
import {RecognizedString, WebSocket, HttpRequest} from "uWebSockets.js";
import { Api } from "./api";
import Emittery from "emittery";
import PromiEvent from "../things/promievent";

/**
 * Connects an arbitrary public chain provider to ganache-core
 */
export interface Connector<ApiImplementation extends Api, RequestFormat = any, ResponseFormat = any> extends Emittery.Typed<undefined, "ready" | "close"> {
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
    | ((payload: RequestFormat, connection: HttpRequest) => Promise<ResponseFormat>)
    | ((payload: RequestFormat, connection: WebSocket) => PromiEvent<ResponseFormat>);

  /**
   * Formats the response (returned from `handle`)
   * @param response
   * @param payload
   */
  format(result: ResponseFormat, payload: RequestFormat): RecognizedString;

  close(): void;
}
