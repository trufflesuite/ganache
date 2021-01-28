import { EthereumInternalOptions } from "@ganache/ethereum-options";
import WebSocket from "ws";
import RateLimiter from "./rate-limiter";

type Headers = { [name: string]: string } & { authorization?: string };

function setAuthHeaders(
  forkingOpts: EthereumInternalOptions["fork"],
  headers: Headers
) {
  if (forkingOpts.username != null || forkingOpts.password != null) {
    if (forkingOpts.jwt != null) throw new Error(invalidAuthError);
    headers.authorization = `Basic ${Buffer.from(
      `${forkingOpts.username || ""}:${forkingOpts.password || ""}`
    ).toString("base64")}`;
  } else if (forkingOpts.jwt) {
    headers.authorization = `Bearer ${forkingOpts.jwt}`;
  }
}

/**
 *
 * @param forkingOpts
 * @param headers
 * @param permitMultiAuth
 */
function setUserHeaders(
  forkingOpts: EthereumInternalOptions["fork"],
  headers: Headers,
  permitMultiAuth: boolean
) {
  // copy the user-provided headers over to the connection's headers
  const userHeaders = forkingOpts.headers;
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
        const [incomingScheme, authParams] = value.split(/\.(.+)/);
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

const invalidAuthError =
  "Authentication via both username/password (Basic) and JWT (Bearer) is not possible";
export class Fork {
  constructor(options: EthereumInternalOptions) {
    let limiter: null | RateLimiter = null;
    if (options.fork.requestsPerSecond > 0) {
      limiter = new RateLimiter(options.fork.requestsPerSecond, 1000);
    }
    const forkingOpts = options.fork;
    const url = forkingOpts.url;
    // we set our own Authentication headers, so username and password must be
    // remove from the url. The values have already been copied to the options)
    url.password = url.username = "";

    const headers: Headers = {
      "user-agent": forkingOpts.userAgent
    };
    if ("origin" in forkingOpts) {
      headers["origin"] = forkingOpts.origin;
    }
    setAuthHeaders(forkingOpts, headers);
    setUserHeaders(forkingOpts, headers, !url.host.endsWith(".infura.io"));

    switch (url.protocol) {
      case "ws:":
      case "wss:":
        {
          let id = 1;
          const l = url.toString();
          const connection = new WebSocket(l, {
            origin: forkingOpts.origin,
            headers
          });
          let open = this.connect(connection);
          connection.onerror = e => {
            console.log(e);
          };
          connection.onclose = (...args) => {
            console.log(args);
            // try to connect again...
            // TODO: backoff and eventually fail
            open = this.connect(connection);
          };
          const requestCache = new Map();
          const inFlightRequests = new Map<number, any>();
          this.request = async (method: string, params: unknown[]) => {
            const msgId = id++;
            const requestKey = JSON.stringify({ method, params });
            if (requestCache.has(requestKey)) {
              return requestCache.get(requestKey);
            }
            const promise = new Promise((resolve, reject) => {
              inFlightRequests.set(msgId, { resolve, reject });
            });
            // requestCache.set(requestKey, promise);
            if (limiter) {
              await limiter.handle();
            }
            await open;
            connection.send(
              `{"jsonrpc":"2.0","id":${msgId},${requestKey.replace(/^{/, "")}`
            );
            return promise.finally(() => requestCache.delete(requestKey));
          };
          connection.onmessage = (event: WebSocket.MessageEvent) => {
            if (event.type !== "message") return;

            let result: any;
            try {
              result = JSON.parse(event.data as any);
            } catch {}

            const id = result.id;
            const prom = inFlightRequests.get(result.id);
            if (prom) {
              inFlightRequests.delete(id);
              if (result.result) {
                prom.resolve(result.result);
              } else if (result.error) {
                prom.reject(result.error);
              }
            }
          };
        }
        break;
      default: {
        this.request = async (method: string, params: unknown[]) => {
          return Promise.resolve(123);
        };
      }
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
