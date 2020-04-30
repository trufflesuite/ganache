import {Provider} from "./provider";
import {RecognizedString} from "uWebSockets.js";
import Api from "./api";
import Emittery from "emittery";
import {RequestType} from "../types";

export default interface Connector<ApiImplementation extends Api, RequestFormat = any, ResponseFormat = any>
  extends Emittery.Typed<{request: RequestType<ApiImplementation>}, "ready" | "close"> {
  provider: Provider<ApiImplementation>;

  /**
   * Parses a raw message into something that can be handled by `handle`
   * @param message
   */
  parse(message: Buffer): RequestFormat;

  /**
   * Handles a parse message
   * @param payload
   */
  handle(payload: RequestFormat): Promise<ResponseFormat>;

  /**
   * Formats the response (from handle)
   * @param response
   * @param payload
   */
  format(result: ResponseFormat, payload: RequestFormat): RecognizedString;
}
