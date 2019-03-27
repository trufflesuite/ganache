import ServerOptions, {getDefault as getDefaultServerOptions} from "./options/server-options";

export type ServerOptions = ServerOptions;

import uWS, { HttpResponse, HttpRequest, RecognizedString, us_listen_socket, WebSocket } from "uWebSockets.js";
import Provider from "./provider";

const noop = ()=>{};

type JsonRpc = {
  id: string,
  jsonrpc: string,
}

interface JsonRpcRequestPayload extends JsonRpc {
  params: Array<any>
}

interface JsonRpcError {
  code: number,
  message: string
}

interface JsonRpcResponsePayload extends JsonRpc {
  id: string,
  jsonrpc: string,
  result?: any,
  error?: JsonRpcError
}

 // 1001 indicates that an endpoint is "going away", such as a server
 // going down or a browser having navigated away from a page.
enum WebSocketCloseCodes {
  CLOSE_GOING_AWAY = 1001,
  CLOSE_PROTOCOL_ERROR = 1002
};

enum ContentTypes {
  PLAIN = "text/plain",
  JSON = "application/json"
}

function rpcError(id: string, code: string, msg: any) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: id,
    error: {
      code: code,
      message: msg
    }
  });
}

function sendResponse(response:HttpResponse, statusCode: number, contentType?: string, data?: RecognizedString, writeHeaders: (response:HttpResponse)=>void = noop): void {
  response.writeStatus(statusCode.toString());
  writeHeaders(response);
  if (contentType) {
    response.writeHeader("Content-Type", contentType);
  }
  response.end(data)
}

/**
 * 
 */
export default class Server {
  private _options: ServerOptions;
  private _listenSocket: us_listen_socket;
  private _app: any;
  private _provider: Provider;
  private _connections: Set<WebSocket> = new Set<WebSocket>();
  constructor(options?: ServerOptions) {
    const _options = this._options = Object.assign(getDefaultServerOptions(), options);
    this._provider = new Provider(_options);

    const app = this._app = uWS.App(null);

    if (_options.ws) {
      app
        .ws("/", {
          /* Options */
          compression: (uWS as any).SHARED_COMPRESSOR,
          maxPayloadLength: 16 * 1024 * 1024,
          idleTimeout: 10, //seconds
          /* Handlers */
          open: (ws: any) => {
            console.log("A WebSocket connected");
            this._connections.add(ws);
          },
          message: async (ws: any, message: ArrayBuffer, isBinary: boolean) => {
            let payload: any;
            try {
              payload = JSON.parse(Buffer.from(message) as any);
            } catch (e) {
              ws.end(WebSocketCloseCodes.CLOSE_PROTOCOL_ERROR, "Received a malformed frame: " + e.message);
              return;
            }
            const method = payload.method;

            const result = await this._provider.send(method, payload.params);
            // The socket may have closed while we were waiting for the response
            // Don't bother trying to send to it now.
            if (!ws.closed) {
              const json = {
                "id": payload.id,
                "jsonrpc":"2.0",
                "result": result
              };
              ws.send(JSON.stringify(json), isBinary, true);
            }
          },
          drain: (ws: WebSocket) => {
            console.log("WebSocket backpressure: " + ws.getBufferedAmount());
          },
          close: (ws: WebSocket) => {
            console.log("A WebSocket disconnected");
            this._connections.delete(ws);
            ws.closed = true;
          }
        });
    }
    app
      .post("/", (response: HttpResponse, request: HttpRequest) => {
        const writeHeaders = prepareCORSResponseHeaders("POST", request);
        
        let buffer: Buffer;
        response.onData((message: ArrayBuffer, isLast: boolean) => {
          const chunk = Buffer.from(message);
          if (isLast) {
            let payload: any;
            try {
              const message = (buffer ? Buffer.concat([buffer, chunk]) : chunk) as any;
              payload = JSON.parse(message);
            } catch (e) {
              sendResponse(response, 400, ContentTypes.PLAIN, "400 Bad Request: " + e.message, writeHeaders);
              return;
            }
            const method = payload.method as string;

            // http connections do not support subscriptions
            if (method === "eth_subscribe" || method === "eth_unsubscribe") {
              sendResponse(response, 400, ContentTypes.JSON, rpcError(payload.id, "-32000", "notifications not supported"), writeHeaders);
            } else {
              this._provider.send(method, payload.params).then((result) => {
                if(!response.aborted){
                  const json = {
                    "id": payload.id,
                    "jsonrpc":"2.0",
                    "result": result
                  };
                  sendResponse(response, 200, ContentTypes.JSON, JSON.stringify(json), writeHeaders);
                }
              });
            }
          } else {
            if (buffer) {
              buffer = Buffer.concat([buffer, chunk]);
            } else {
              buffer = Buffer.concat([chunk]);
            }
          }
        });
        response.onAborted(() => {
          response.aborted = true;
        });
      }).options("/", (response: HttpResponse, request: HttpRequest) => {
        const writeHeaders = prepareCORSResponseHeaders("OPTIONS", request);
        // OPTIONS responses don't have a body, so respond with `204 No Content`
        sendResponse(response, 204, null, null, writeHeaders);
      }).get("/418", (response: HttpResponse) => {
        // Because Easter Eggs are fun.
        sendResponse(response, 418, ContentTypes.PLAIN, "418 I'm a teapot");
      }) 
      .any("/", (response: HttpResponse) => {
        // any other request to "/" is not allowed, so respond with `405 Method Not Allowed`
        sendResponse(response, 405, ContentTypes.PLAIN, "405 Method Not Allowed");
      })
      .any("/*", (response: HttpResponse) => {
        // all other requests don't mean anything to us, so respond with `404 NOT FOUND`
        sendResponse(response, 404, ContentTypes.PLAIN, "404 Not Found");
      });
  }
  
  async listen(port: number, callback?: (err: Error) => void): Promise<void> {
    let err;
    if (this._listenSocket) {
      err = new Error("Server is already listening.");
    } else {
      const listenSocket = await new Promise((resolve) => {
        this._app.listen(port, resolve);
      });
      
      if(listenSocket){
        this._listenSocket = listenSocket;
        err = null;
      } else {
        err = new Error("Failed to listen on port: " + port);
      }
    }

    if (typeof callback === "function") {
      callback(err);
    } else if (err){
      throw err;
    }
  }
  close() {
    const listenSocket = this._listenSocket;
    if (listenSocket) {
      this._listenSocket = undefined;
      // close the socket to prevent any more connections
      uWS.us_listen_socket_close(listenSocket);
      // close all the currently connection websockets:
      this._connections.forEach(ws => ws.end(WebSocketCloseCodes.CLOSE_GOING_AWAY, "Server closed by client"));
      this._listenSocket = undefined;
    }
  }
}

/**
 * uWS doesn't let us use the request after the 
 * @param method 
 * @param request 
 */
function prepareCORSResponseHeaders(method: string, request: HttpRequest) {
  // https://fetch.spec.whatwg.org/#http-requests
  const origin = request.getHeader("origin");
  const acrh = request.getHeader("access-control-request-headers");
  return (response: HttpResponse) => {
    const isCORSRequest = true || origin !== "";
    if (isCORSRequest) {
      // OPTIONS preflight requests need a little extra treatment
      if (method === "OPTIONS") {
        // we only allow POST requests, so it doesn't matter which method the request is asking for
        response.writeHeader("Access-Control-Allow-Methods", "POST");
        // echo all requested access-control-request-headers back to the response
        if (acrh !== "") {
          response.writeHeader("Access-Control-Allow-Headers", acrh);
        }
        // Safari needs Content-Length = 0 for a 204 response otherwise it hangs forever
        // https://github.com/expressjs/cors/pull/121#issue-130260174
        response.writeHeader("Content-Length", "0");

        // Make browsers and compliant clients cache the OPTIONS preflight response for 10
        // minutes (this is the maximum time Chromium allows)
        response.writeHeader("Access-Control-Max-Age", "600"); // seconds
      }

      // From the spec: https://fetch.spec.whatwg.org/#http-responses
      // "For a CORS-preflight request, request’s credentials mode is always "omit",
      // but for any subsequent CORS requests it might not be. Support therefore
      // needs to be indicated as part of the HTTP response to the CORS-preflight request as well.", so this
      // header is added to all requests.
      // Additionally, https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials,
      // states that there aren't any HTTP Request headers that indicate you whether or not Request.withCredentials
      // is set. Because web3@1.0.0-beta.35-? always sets `request.withCredentials = true` while Safari requires it be
      // returned even when no credentials are set in the browser this header must always be return on all requests.
      // (I've found that Chrome and Firefox don't actually require the header when credentials aren't set)
      //  Regression Commit: https://github.com/ethereum/web3.js/pull/1722
      //  Open Web3 Issue: https://github.com/ethereum/web3.js/issues/1802
      response.writeHeader("Access-Control-Allow-Credentials", "true");

      // From the spec: "It cannot be reliably identified as participating in the CORS protocol
      // as the `Origin` header is also included for all requests whose method is neither
      // `GET` nor `HEAD`."
      // Explicitly set the origin instead of using *, since credentials
      // can't be used in conjunction with *. This will always be set
      /// for valid preflight requests.
      response.writeHeader("Access-Control-Allow-Origin", origin);
    }
  }
}