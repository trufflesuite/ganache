import {
  RecognizedString,
  WebSocketBehavior,
  TemplatedApp as uWsTemplatedApp
} from "@trufflesuite/uws-js-unofficial";

import { HttpHandler, ListenCallback } from "./types";
import { HttpContext } from "./http-context";
import { HttpResponse } from "./http-response";
import { HttpRequest } from "./http-request";

export default class TemplatedApp implements uWsTemplatedApp {
  httpContext: HttpContext = new HttpContext();

  constructor() {}

  ws(pattern: RecognizedString, behavior: WebSocketBehavior) {
    this.httpContext.onWs(pattern, behavior);

    this.httpContext.onHttp(
      "get",
      pattern,
      (res: HttpResponse, req: HttpRequest) => {
        const secWebSocketKey = req.getHeader("sec-websocket-key");
        if (secWebSocketKey.length == 24) {
        } else {
          req.setYield(true);
        }
      },
      true
    );
    return this;
  }

  get(pattern: RecognizedString, handler: HttpHandler) {
    this.httpContext.onHttp("get", pattern, handler);
    return this;
  }

  post(pattern: RecognizedString, handler: HttpHandler) {
    this.httpContext.onHttp("post", pattern, handler);
    return this;
  }

  options(pattern: RecognizedString, handler: HttpHandler) {
    this.httpContext.onHttp("options", pattern, handler);
    return this;
  }

  del(pattern: RecognizedString, handler: HttpHandler) {
    this.httpContext.onHttp("delete", pattern, handler);
    return this;
  }

  patch(pattern: RecognizedString, handler: HttpHandler) {
    this.httpContext.onHttp("patch", pattern, handler);
    return this;
  }

  put(pattern: RecognizedString, handler: HttpHandler) {
    this.httpContext.onHttp("put", pattern, handler);
    return this;
  }

  head(pattern: RecognizedString, handler: HttpHandler) {
    this.httpContext.onHttp("head", pattern, handler);
    return this;
  }

  connect(pattern: RecognizedString, handler: HttpHandler) {
    this.httpContext.onHttp("connect", pattern, handler);
    return this;
  }

  trace(pattern: RecognizedString, handler: HttpHandler) {
    this.httpContext.onHttp("trace", pattern, handler);
    return this;
  }

  any(pattern: RecognizedString, handler: HttpHandler) {
    this.httpContext.onHttp("*", pattern, handler);
    return this;
  }

  listen(
    arg1: number | RecognizedString,
    arg2: ((listenSocket: any) => void) | number,
    arg3?: any,
    arg4?: any
  ) {
    let host: RecognizedString;
    let port: number;
    let options: number;
    let callback: ListenCallback;
    if (typeof arg1 === "string") {
      host = arg1;
      port = arg2 as number;
      if (typeof arg3 === "number") {
        options = arg3;
        callback = arg4 as ListenCallback;
      } else {
        options = 0;
        callback = arg3;
      }
    } else {
      host = "127.0.0.1";
      port = arg1 as number;
      if (typeof arg2 === "number") {
        options = arg2;
        callback = arg3 as ListenCallback;
      } else {
        options = 0;
        callback = arg2;
      }
    }
    this.httpContext.listen(host, port, callback);
    return this;
  }

  publish(
    topic: RecognizedString,
    message: RecognizedString,
    isBinary?: boolean,
    compress?: boolean
  ) {
    throw new Error("Not implemented");
    return this;
  }
}
