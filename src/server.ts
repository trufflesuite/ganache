import _ServerOptions from "./options/server-options";

export type ServerOptions = _ServerOptions;
export const ServerOptions = _ServerOptions;
import uWS, { HttpResponse, HttpRequest, RecognizedString, us_listen_socket } from "uWebSockets.js";
import Provider from "./provider"
import ProviderOptions from "./options/provider-options";

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

function sendResponse(response:HttpResponse, statusCode:number, data?: RecognizedString): void {
  response
    .writeStatus(statusCode.toString())
    .end(data);
}
/**
 * 
 */
export default class Server {
  private _listenSocket: us_listen_socket;
  private _app: any;
  private _provider: Provider;
  constructor(options: ServerOptions) {
    this._provider = new Provider(options as ProviderOptions);

    const app = this._app = uWS.App({});

    app
      .ws("/", {
        /* Options */
        compression: 0,
        maxPayloadLength: 16 * 1024 * 1024,
        idleTimeout: 10,
        /* Handlers */
        open: (ws, req) => {
          console.log('A WebSocket connected via URL: ' + req.getUrl() + '!');
        },
        message: (ws, message: ArrayBuffer, isBinary) => {
          const payload = JSON.parse(Buffer.from(message) as any);
          this._provider.send(payload.method as string, payload.params as Array<any>).then((result:any) => {
            //this._provider.send(payload.method as string, payload.params as Array<any>).then((result:any) => {
            /* Ok is false if backpressure was built up, wait for drain */
            const json = {
              "id": payload.id,
              "jsonrpc":"2.0",
              "result": result
            };
            let ok = ws.send(JSON.stringify(json), false, true);
          });
        },
        drain: (ws) => {
          console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
        },
        close: (ws, code, message) => {
          console.log('WebSocket closed');
        }
      })
      .post("/", (response: HttpResponse, request: HttpRequest) => {
      createCORSResponseHeaders("POST", response, request);
      
      let buffer: Buffer;
      response.onData(async (ab: ArrayBuffer, isLast: boolean) => {
        const chunk = Buffer.from(ab);
        if(isLast) {
          let payload: any;
          try {
            payload = JSON.parse((buffer ? Buffer.concat([buffer, chunk]) : chunk) as any);
          } catch (e) {
            response.writeHeader("Content-Type", "text/plain");
            sendResponse(response, 400, "400 Bad Request");
            return;
          }
          const method = payload.method;

          // http connections do not support subscriptions
          if (method === "eth_subscribe" || method === "eth_unsubscribe") {
            response.writeHeader("Content-Type", "application/json");
            sendResponse(response, 400, rpcError(payload.id, "-32000", "notifications not supported"));
          } else {
            this._provider.send(payload.method as string, payload.params as Array<any>).then((result:any) => {
              if(!response.aborted){
                const json = {
                  "id": payload.id,
                  "jsonrpc":"2.0",
                  "result": result
                };
                response.writeHeader("Content-Type", "application/json");
                sendResponse(response, 200, JSON.stringify(json));
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
      createCORSResponseHeaders("OPTIONS", response, request);
      sendResponse(response, 204);
    }).any("/*", (response: HttpResponse) => {
      response.writeHeader("Content-Type", "text/plain");
      sendResponse(response, 400, "400 Bad Request");
    });
  }
  
  async listen(port: number, callback?: () => void): Promise<void> {
    this._listenSocket = await new Promise((resolve) => {
      this._app.listen(port, resolve);
    });
    if (typeof callback === "function") {
      callback();
    }
  }
  async close(): Promise<any> {
    if (this._listenSocket) {
      uWS.us_listen_socket_close(this._listenSocket);
      this._listenSocket = undefined;
    }
  }
}


function createCORSResponseHeaders(method: string, response: HttpResponse, request: HttpRequest) {
  // https://fetch.spec.whatwg.org/#http-requests
  const origin = request.getHeader("origin");
  const isCORSRequest = true || origin !== "";
  if (isCORSRequest) {
    // OPTIONS preflight requests need a little extra treatment
    if (method === "OPTIONS") {
      // we only allow POST requests, so it doesn't matter which method the request is asking for
      response.writeHeader("Access-Control-Allow-Methods", "POST");
      // echo all requested access-control-request-headers back to the response
      if (request.hasOwnProperty("access-control-request-headers")) {
        const acrh = request.getHeader("access-control-request-headers");
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