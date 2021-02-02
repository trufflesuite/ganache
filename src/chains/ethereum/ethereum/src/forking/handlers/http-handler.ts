import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { JsonRpcTypes, types } from "@ganache/utils";
import { AbortError } from "@ganache/ethereum-utils";
// TODO: support http2
import http, { RequestOptions, Agent as HttpAgent } from "http";
import https, { Agent as HttpsAgent } from "https";
import { AbortSignal } from "abort-controller";
import { BaseHandler } from "./base-handler";
import { Handler, JsonRpcResponse } from "../types";
import Deferred from "../deferred";

const { JSONRPC_PREFIX } = BaseHandler;

export class HttpHandler extends BaseHandler implements Handler {
  private agent: HttpAgent;
  private url: types.URL;

  private _request: (
    url: string | types.URL,
    options: RequestOptions,
    callback?: (res: http.IncomingMessage) => void
  ) => http.ClientRequest;

  constructor(options: EthereumInternalOptions, abortSignal: AbortSignal) {
    super(options, abortSignal);

    this.url = options.fork.url;
    this.headers.accept = this.headers["content-type"] = "application/json";

    if (this.url.protocol === "http:") {
      // as `any` because nodes types http.request with nodes Legacy URL API, but
      // it actually uses the WHATWG URL API
      this._request = http.request as any;

      this.agent = new HttpAgent({
        keepAlive: true,
        scheduling: "fifo"
      });
    } else {
      this._request = https.request as any;

      this.agent = new HttpsAgent({
        keepAlive: true,
        scheduling: "fifo"
      });
    }
  }
  private handleLengthedResponse(res: http.IncomingMessage, length: number) {
    let buffer = Buffer.allocUnsafe(length);
    let offset = 0;
    return new Promise<Buffer>((resolve, reject) => {
      function data(message: Buffer) {
        const messageLength = message.length;
        // note: Node will NOT send us more data than the content-length header
        // denotes, so we don't have to worry about it.
        message.copy(buffer, offset, 0, messageLength);
        offset += messageLength;
      }
      function end() {
        // note: Node doesn't check if the content-length matches, so we do that
        // here
        if (offset !== buffer.length) {
          // if we didn't receive enough data, throw
          reject(new Error("content-length mismatch"));
        } else {
          resolve(buffer);
        }
      }
      res.on("data", data);
      res.on("end", end);
    });
  }
  private handleChunkedResponse(res: http.IncomingMessage) {
    let buffer: Buffer;
    return new Promise<Buffer>(resolve => {
      res.on("data", (message: Buffer) => {
        const chunk = message;
        if (buffer) {
          buffer = Buffer.concat([buffer, chunk], buffer.length + chunk.length);
        } else {
          buffer = Buffer.concat([chunk], chunk.length);
        }
      });

      res.on("end", () => {
        resolve(buffer);
      });
    });
  }

  public async request(method: string, params: unknown[]) {
    const data = JSON.stringify({ method, params });
    if (this.requestCache.has(data)) {
      //console.log("cache hit: " + data);
      return this.requestCache.get(data);
    }

    const requestOptions = {
      headers: this.headers,
      // host: url.host,
      // protocol: url.protocol,
      method: "POST",
      // path: url.pathname + url.search,
      // port: url.port,
      agent: this.agent,
      // Node v15 support AbortSignals directly
      signal: this.abortSignal
    };

    const send = () => {
      if (this.abortSignal.aborted) return Promise.reject(new AbortError());

      //console.log("sending request: " + data);
      const deferred = Deferred<JsonRpcResponse>();
      const postData = `${JSONRPC_PREFIX}${this.id++},${data.slice(1)}`;
      this.headers["content-length"] = postData.length;

      const req = this._request(this.url, requestOptions);
      req.on("response", res => {
        const { headers } = res;

        let buffer: Promise<Buffer>;
        // if we have a transfer-encoding we don't care about "content-length"
        // (per HTTP spec). We also don't care about invalid lengths
        if ("transfer-encoding" in headers) {
          buffer = this.handleChunkedResponse(res);
        } else {
          const length = (headers["content-length"] as any) / 1;
          if (isNaN(length) || length <= 0) {
            buffer = this.handleChunkedResponse(res);
          } else {
            // we have a content-length; use it to pre-allocate the required memory
            buffer = this.handleLengthedResponse(res, length);
          }
        }

        // TODO: handle invalid JSON (throws on parse)?
        buffer.then(buffer => {
          deferred.resolve(JSON.parse(buffer));
        });
      });

      // after 5 seconds of idle abort the request
      req.setTimeout(5000, req.abort.bind(req, null));
      req.on("error", deferred.reject);
      req.write(postData);
      req.end();

      return deferred.promise.finally(() => this.requestCache.delete(data));
    };

    const promise = this.limiter.handle(send).then(result => {
      if ("result" in result) {
        return result.result;
      } else if ("error" in result) {
        throw result.error;
      }
    });
    this.requestCache.set(data, promise);
    return promise;
  }
}
