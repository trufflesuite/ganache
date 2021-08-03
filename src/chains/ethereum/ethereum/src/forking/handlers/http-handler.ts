import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { JsonRpcResponse, JsonRpcError } from "@ganache/utils";
import { AbortError } from "@ganache/ethereum-utils";
// TODO: support http2
import http, { RequestOptions, Agent as HttpAgent } from "http";
import https, { Agent as HttpsAgent } from "https";
import { AbortSignal } from "abort-controller";
import { BaseHandler } from "./base-handler";
import { Handler } from "../types";
import Deferred from "../deferred";

const { JSONRPC_PREFIX } = BaseHandler;

export class HttpHandler extends BaseHandler implements Handler {
  private agent: HttpAgent;
  private url: URL;

  private _request: (
    options: RequestOptions,
    callback?: (res: http.IncomingMessage) => void
  ) => http.ClientRequest;

  constructor(options: EthereumInternalOptions, abortSignal: AbortSignal) {
    super(options, abortSignal);

    this.url = options.fork.url;
    this.headers.accept = this.headers["content-type"] = "application/json";

    if (this.url.protocol === "http:") {
      this._request = http.request;

      this.agent = new HttpAgent({
        keepAlive: true,
        scheduling: "fifo"
      });
    } else {
      this._request = https.request;

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

    const { protocol, hostname: host, port, pathname, search } = this.url;
    const requestOptions = {
      protocol,
      host,
      port,
      path: pathname + search,
      headers: this.headers,
      method: "POST",
      agent: this.agent,
      // Node v15 supports AbortSignals directly
      signal: this.abortSignal
    };

    const send = () => {
      if (this.abortSignal.aborted) return Promise.reject(new AbortError());

      //console.log("sending request: " + data);
      const deferred = Deferred<JsonRpcResponse | JsonRpcError>();
      const postData = `${JSONRPC_PREFIX}${this.id++},${data.slice(1)}`;
      this.headers["content-length"] = postData.length;

      const req = this._request(requestOptions);
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
          try {
            deferred.resolve(JSON.parse(buffer));
          } catch {
            const resStr = buffer.toString();
            let shortStr: string;
            if (resStr.length > 340) {
              // truncate long errors so we don't blow up the user's logs
              shortStr = resStr.slice(0, 320) + "…";
            } else {
              shortStr = resStr;
            }
            let msg = `Invalid JSON response from fork provider:\n\n ${shortStr}`;
            if (
              (resStr.startsWith("invalid project id") ||
                resStr.startsWith("project id required in the url")) &&
              this.url.host.endsWith("infura.io")
            ) {
              msg += `\n\nThe provided fork url, ${this.url}, may be an invalid or incorrect Infura endpoint.`;
              msg += `\nVisit https://infura.io/docs/ethereum for Infura documentation.`;
            }
            deferred.reject(new Error(msg));
          }
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

  public close() {
    // no op
    return Promise.resolve();
  }
}
