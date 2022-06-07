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
import zlib from "zlib";
import stream from "stream";

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
    if (!process.env.IS_BROWSER) {
      // brotli decompression is generally faster to decode than deflate/gzip, so
      // we prefer it, and deflate is technically faster than gzip (it doesn't
      // calculate a checksum) but I doubt it's measurable.
      // `"accept-encoding"` is handled by the browser automatically (and adding
      // it can actually break OPTIONS pre-flight requests), so we only add this
      // header for Node.
      this.headers["accept-encoding"] = "br;q=1.0, deflate;q=0.9, gzip;q=0.8";
    }

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
  private async handleLengthedResponse(
    res: http.IncomingMessage,
    length: number,
    contentEncoding: string = "identity"
  ) {
    let readable: stream.Transform;
    switch (contentEncoding) {
      // contentEncoding is always "identity" in the browser
      case "identity":
        // response is not compressed:
        return await new Promise<Buffer>((resolve, reject) => {
          const buffer = Buffer.allocUnsafe(length);
          let offset = 0;
          function data(message: Buffer) {
            const messageLength = message.length;
            // note: Node will NOT send us more data than the content-length header
            // denotes, so we don't have to worry about it.
            message.copy(buffer, offset, 0, messageLength);
            offset += messageLength;
          }
          function end() {
            // note: Node doesn't check if the content-length matches (we might
            // receive less data than expected), so we do that here
            if (offset !== length) {
              // if we didn't receive enough data, throw
              reject(new Error("content-length mismatch"));
            } else {
              resolve(buffer);
            }
          }
          res.on("data", data);
          res.on("end", end);
          res.on("error", reject);
        });
      case "gzip":
        readable = res.pipe(zlib.createGunzip());
        break;
      case "deflate":
        readable = res.pipe(zlib.createInflate());
        break;
      case "br":
        readable = res.pipe(zlib.createBrotliDecompress());
        break;
      default:
        throw new Error(
          `Unsupported content-encoding: ${contentEncoding}. This may be a bug in Ganache; please report it.`
        );
    }

    const chunks = [];
    let totalLength = 0;
    for await (let chunk of readable) {
      chunks.push(chunk);
      totalLength += chunk.length;
    }
    return chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, totalLength);
  }
  private async handleChunkedResponse(
    res: http.IncomingMessage,
    contentEncoding: string = "identity"
  ) {
    let readable: stream.Transform | stream.Readable;
    switch (contentEncoding) {
      // contentEncoding is always "identity" in the browser
      case "identity":
        readable = res;
        break;
      case "gzip":
        readable = res.pipe(zlib.createGunzip());
        break;
      case "deflate":
        readable = res.pipe(zlib.createInflate());
        break;
      case "br":
        readable = res.pipe(zlib.createBrotliDecompress());
        break;
      default:
        throw new Error(
          `Unsupported content-encoding: ${contentEncoding}. This may be a bug in Ganache; please report it.`
        );
    }

    const chunks = [];
    let totalLength = 0;
    for await (let chunk of readable) {
      chunks.push(chunk);
      totalLength += chunk.length;
    }
    return chunks.length === 1 ? chunks[0] : Buffer.concat(chunks, totalLength);
  }

  public async request<T>(
    method: string,
    params: unknown[],
    options = { disableCache: false }
  ) {
    const key = JSON.stringify({ method, params });
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

      const deferred = Deferred<{
        response: JsonRpcResponse | JsonRpcError;
        raw: Buffer;
      }>();
      const postData = `${JSONRPC_PREFIX}${this.id++},${key.slice(1)}`;
      this.headers["content-length"] = postData.length;

      const req = this._request(requestOptions);
      req.on("response", res => {
        const { headers } = res;

        let buffer: Promise<Buffer>;
        // in the browser we can't detect if the response is compressed (gzip),
        // but it doesn't matter since the browser has decompressed already
        // anyway, so we just always handle it as chunked and "identity"
        // encoding.
        if (process.env.IS_BROWSER) {
          buffer = this.handleChunkedResponse(res, "identity");
        } else {
          // if we have a transfer-encoding we don't care about "content-length"
          // (per HTTP spec). We also don't care about invalid lengths
          if ("transfer-encoding" in headers) {
            buffer = this.handleChunkedResponse(
              res,
              headers["content-encoding"]
            );
          } else {
            const length = (headers["content-length"] as any) / 1;
            const browser = (res as any)._mode === "fetch";
            if (browser || isNaN(length) || length <= 0) {
              buffer = this.handleChunkedResponse(
                res,
                headers["content-encoding"]
              );
            } else {
              // we have a content-length; use it to pre-allocate the required memory
              buffer = this.handleLengthedResponse(
                res,
                length,
                headers["content-encoding"]
              );
            }
          }
        }

        // TODO: handle invalid JSON (throws on parse)?
        buffer.then(buffer => {
          try {
            deferred.resolve({
              response: JSON.parse(buffer),
              raw: buffer
            });
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

      return deferred.promise.finally(() => this.requestCache.delete(key));
    };

    return await this.queueRequest<T>(method, params, key, send, options);
  }
}
