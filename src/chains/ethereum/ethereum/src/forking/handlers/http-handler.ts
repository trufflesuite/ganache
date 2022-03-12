import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { AbortError } from "@ganache/ethereum-utils";
import { Pool, Dispatcher } from "undici";
import { AbortSignal } from "abort-controller";
import { BaseHandler, Headers } from "./base-handler";
import { Handler } from "../types";
import { getHandlers } from "../header-helpers";

const { JSONRPC_PREFIX } = BaseHandler;

function makeSend(id: number, key: string, url: URL, headers: Headers, signal: AbortSignal, pool: Pool) {
  return async function send() {
    if (signal.aborted) return Promise.reject(new AbortError());

    const body = Buffer.from(`${JSONRPC_PREFIX}${id},${key.slice(1)}`, "utf8");
    headers["content-length"] = body.byteLength.toString(10);

    const requestOptions: Dispatcher.RequestOptions = {
      headersTimeout: 5000,
      origin: url.origin,
      path: url.pathname + url.search,
      headers,
      // forking never makes destructive changes, so we can set idempotent to
      // `true` for all requests
      idempotent: true,
      method: "POST",
      // Node v15 supports AbortSignals directly
      signal,
      body,
      // 21 because the very popular https://www.npmjs.com/package/follow-redirects uses 21
      maxRedirections: 21,
      opaque: true,
      responseHeader: "raw"
    };

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const handlers: Dispatcher.DispatchHandlers = {
        onData: () => {
          throw new Error("Received data before expected. This is a software defect.");
        },
        onConnect: () => {
          // the onConnect handler is required.
        },
        onError: (err: Error) => reject(err),
        // @ts-ignore undici actually returns headers as a `buffer[]`, but their
        // TS type is `string[]`
        onHeaders: (statusCode: number, headers: Buffer[]) => {
          if (signal.aborted) return void reject(new AbortError());

          // ignore informational status codes, which can happen many times over
          // a single request. These status codes will not provider the headers
          // we want, nor will they have a body.
          if (statusCode >= 100 && statusCode < 200) return true;

          // if we have a transfer-encoding we don't care about "content-length"
          // (per HTTP spec). We also don't care about invalid lengths
          try {
            const { onData, onComplete } = getHandlers(headers);
            handlers.onData = onData;
            handlers.onComplete = (trailers: string[]) => {
              try {
                const data = onComplete(trailers);
                resolve(data);
              } catch (err) {
                reject(err);
              }
            };
          } catch (e: any) {
            pool.destroy(e).finally(() => reject(e));
            return false;
          }

          return true;
        },
        onComplete: () => {
          throw new Error("Received `complete` event before expected. This is a software defect.");
        }
      };
      pool.dispatch(requestOptions, handlers);
    });

    if (signal.aborted) throw new AbortError();

    try {
      return {
        response: JSON.parse(buffer),
        raw: buffer
      };
    } catch (e) {
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
        url.host.endsWith("infura.io")
      ) {
        msg += `\n\nThe provided fork url, ${url}, may be an invalid or incorrect Infura endpoint.`;
        msg += `\nVisit https://infura.io/docs/ethereum for Infura documentation.`;
      }
      throw new Error(msg);
    }
  }
}

export class HttpHandler extends BaseHandler implements Handler {
  private pool: Pool;
  private url: URL;

  constructor(options: EthereumInternalOptions, abortSignal: AbortSignal) {
    super(options, abortSignal);

    this.url = options.fork.url;
    this.headers.accept = this.headers["content-type"] = "application/json";

    this.pool = new Pool(this.url.origin, {
      pipelining: 50,
      connections: 10,
    });
  }

  public async request<T>(
    method: string,
    params: unknown[],
    options = { disableCache: false }
  ) {
    const key = JSON.stringify({ method, params });
    const send = makeSend(this.id++, key, this.url, this.headers, this.abortSignal, this.pool);
    return await this.queueRequest<T>(method, params, key, send, options);
  }
}
