import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { JsonRpcTypes } from "@ganache/utils";
import WebSocket from "ws";
import RateLimiter from "./rate-limiter";
import https, { Agent } from "https";
import { OutgoingHttpHeaders } from "http";

type Headers = OutgoingHttpHeaders & { authorization?: string };
type JsonRpcResponse = JsonRpcTypes.Error | JsonRpcTypes.Response;
type DeferredPromiseInterface<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

const JSONRPC_PREFIX = '{"jsonrpc":"2.0","id":';
const INVALID_AUTH_ERROR =
  "Authentication via both username/password (Basic) and JWT (Bearer) is not possible";
const WINDOW_SECONDS = 30;

function Deferred<T>() {
  const deferred = {} as DeferredPromiseInterface<T>;
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

/**
 * Adds Authorization headers from the given options to the provided `headers`
 * object. Overwrites an existing `Authorization` header value.
 *
 * @param options
 * @param headers
 */
function setAuthHeaders(
  options: EthereumInternalOptions["fork"],
  headers: Headers
) {
  if (options.username != null || options.password != null) {
    if (options.jwt != null) throw new Error(INVALID_AUTH_ERROR);
    headers.authorization = `Basic ${Buffer.from(
      `${options.username || ""}:${options.password || ""}`
    ).toString("base64")}`;
  } else if (options.jwt) {
    headers.authorization = `Bearer ${options.jwt}`;
  }
}

/**
 * Adds user provided headers to the provided `headers`
 * object.
 *
 * If the headers already contain an existing `Authorization` header
 * value and the incoming values have compatible schemes
 * (Bearer===Bearer, Basic===Basic) the values are merged. Note: if the
 * `permitMultiAuth` option is `false` Bearer tokens can not be merged.
 *
 * @param options
 * @param headers
 * @param permitMultiAuth
 */
function setUserHeaders(
  options: EthereumInternalOptions["fork"],
  headers: Headers,
  permitMultiAuth: boolean
) {
  // copy the user-provided headers over to the connection's headers
  const userHeaders = options.headers;
  if (userHeaders) {
    for (let i = 0, l = userHeaders.length; i < l; i++) {
      let { name, value } = userHeaders[i];
      const key = name.toLowerCase();
      // if the user specified multiple Authentication headers (.e.g, via
      // username/password or the jwt field) we need to join them when
      // they are both of the same scheme, otherwise we throw an exception.
      if (key === "authorization" && "authorization" in headers) {
        if (!permitMultiAuth) {
          throw new Error(
            `Authentication with multiple auth-params is not allowed.`
          );
        }
        const currentScheme = headers.authorization.split(" ", 1)[0];
        const [incomingScheme, authParams] = value.split(/\.(?:.+)/);
        if (incomingScheme.toLowerCase() === currentScheme.toLowerCase()) {
          headers.authorization += "," + authParams;
        } else {
          throw new Error(
            `Authentication via both ${currentScheme} and ${incomingScheme} is not allowed.`
          );
        }
      } else {
        headers[key] = value;
      }
    }
  }
}

export class Fork {
  constructor(options: EthereumInternalOptions) {
    const forkingOptions = options.fork;
    const { requestsPerSecond, url, userAgent, origin } = forkingOptions;

    const limiter = new RateLimiter(
      // convert `requestsPerSecond` to "requests per window"
      //requestsPerSecond * WINDOW_SECONDS,
      10 * WINDOW_SECONDS,
      WINDOW_SECONDS * 1000
    );

    const headers: Headers = {
      "user-agent": userAgent
    };
    if (origin) {
      headers["origin"] = origin;
    }

    // we set our own Authentication headers, so username and password must be
    // removed from the url. (The values have already been copied to the options)
    url.password = url.username = "";

    setAuthHeaders(forkingOptions, headers);
    setUserHeaders(forkingOptions, headers, !url.host.endsWith(".infura.io"));

    const requestCache = new Map<string, Promise<JsonRpcResponse>>();
    let id = 1;

    switch (url.protocol) {
      case "ws:":
      case "wss:":
        {
          const connection = new WebSocket(url.toString(), {
            origin,
            headers
          });
          let open = this.connect(connection);
          connection.onclose = () => {
            // try to connect again...
            // TODO: backoff and eventually fail
            open = this.connect(connection);
          };
          const inFlightRequests = new Map<
            string | number,
            DeferredPromiseInterface<JsonRpcResponse>
          >();
          this.request = async (method: string, params: unknown[]) => {
            await open;

            const data = JSON.stringify({ method, params });
            if (requestCache.has(data)) {
              //console.log("cache hit: " + data);
              return requestCache.get(data);
            }

            const send = () => {
              //console.log("sending request: " + data);
              const messageId = id++;
              const deferred = Deferred<JsonRpcResponse>();

              // TODO: timeout an in-flight request after some amount of time
              inFlightRequests.set(messageId, deferred);

              connection.send(JSONRPC_PREFIX + messageId + `,${data.slice(1)}`);
              return deferred.promise.finally(() => requestCache.delete(data));
            };
            const promise = limiter.handle(send).then(result => {
              if ("result" in result) {
                return result.result;
              } else if ("error" in result) {
                throw result.error;
              }
            });
            requestCache.set(data, promise);
            return promise;
          };

          connection.onmessage = (event: WebSocket.MessageEvent) => {
            if (event.type !== "message") return;

            // TODO: handle invalid JSON (throws on parse)?
            const result = JSON.parse(event.data as any) as JsonRpcResponse;
            const id = result.id;
            const prom = inFlightRequests.get(id);
            if (prom) {
              inFlightRequests.delete(id);
              prom.resolve(result);
            }
          };
        }
        break;
      default: {
        const agent = new Agent({
          keepAlive: true,
          scheduling: "fifo"
        });
        this.request = async (method: string, params: unknown[]) => {
          const data = JSON.stringify({ method, params });
          if (requestCache.has(data)) {
            //console.log("cache hit: " + data);
            return requestCache.get(data);
          }

          headers["content-type"] = "application/json";
          const requestOptions = {
            accept: "application/json",
            headers,
            // host: url.host,
            // protocol: url.protocol,
            method: "POST",
            // path: url.pathname + url.search,
            // port: url.port,
            agent
          };
          const send = () => {
            //console.log("sending request: " + data);
            const messageId = id++;
            const deferred = Deferred<JsonRpcResponse>();
            const postData = JSONRPC_PREFIX + messageId + `,${data.slice(1)}`;
            headers["content-length"] = postData.length;

            const req = https.request(url.toString(), requestOptions, res => {
              const length = (res.headers["content-length"] as any) / 1;
              let buffer: Buffer;
              if (!isNaN(length)) {
                buffer = Buffer.allocUnsafe(length);
                let offset = 0;
                res.on("data", (message: Buffer) => {
                  message.copy(buffer, offset);
                  offset += message.length;
                });
                res.on("end", () => {
                  // if the server sent us less data than they said they would
                  // truncate our buffer
                  if (offset < buffer.length) {
                    buffer = buffer.slice(0, offset);
                  }
                  // TODO: handle invalid JSON (throws on parse)?
                  deferred.resolve(JSON.parse(buffer));
                });
              } else {
                res.on("data", (message: Buffer) => {
                  const chunk = message;
                  if (buffer) {
                    buffer = Buffer.concat(
                      [buffer, chunk],
                      buffer.length + chunk.length
                    );
                  } else {
                    buffer = Buffer.concat([chunk], chunk.length);
                  }
                });
                res.on("end", () => {
                  // TODO: handle invalid JSON (throws on parse)?
                  deferred.resolve(JSON.parse(buffer));
                });
              }
            });

            req.on("error", deferred.reject);
            req.write(postData);
            req.end();

            return deferred.promise.finally(() => requestCache.delete(data));
          };

          const promise = limiter.handle(send).then(result => {
            if ("result" in result) {
              return result.result;
            } else if ("error" in result) {
              throw result.error;
            }
          });
          requestCache.set(data, promise);
          return promise;
        };
      }
      // TODO: ipc? pipes? sockets?
    }
  }

  public connect(connection: WebSocket) {
    let open = new Promise((resolve, reject) => {
      connection.onopen = resolve;
      connection.onerror = reject;
    });
    open.then(
      () => {
        connection.onopen = null;
        connection.onerror = null;
      },
      err => {
        console.log(err);
      }
    );
    return open;
  }

  public request: (method: string, params: unknown[]) => Promise<unknown>;
}
