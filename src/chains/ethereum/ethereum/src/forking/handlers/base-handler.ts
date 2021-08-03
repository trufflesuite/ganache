import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { JsonRpcError, JsonRpcResponse } from "@ganache/utils";
import { AbortSignal } from "abort-controller";
import { OutgoingHttpHeaders } from "http";
import RateLimiter from "../rate-limiter/rate-limiter";

type Headers = OutgoingHttpHeaders & { authorization?: string };

const INVALID_AUTH_ERROR =
  "Authentication via both username/password (Basic) and JWT (Bearer) is not possible";
const WINDOW_SECONDS = 30;

export class BaseHandler {
  static JSONRPC_PREFIX = '{"jsonrpc":"2.0","id":';
  protected id: number = 1;
  protected requestCache = new Map<
    string,
    Promise<JsonRpcError | JsonRpcResponse>
  >();
  protected limiter: RateLimiter;
  protected headers: Headers;
  protected abortSignal: AbortSignal;

  constructor(options: EthereumInternalOptions, abortSignal: AbortSignal) {
    const forkingOptions = options.fork;
    const { requestsPerSecond, url, userAgent, origin } = forkingOptions;

    this.abortSignal = abortSignal;
    this.limiter = new RateLimiter(
      // convert `requestsPerSecond` to "requests per window"
      requestsPerSecond * WINDOW_SECONDS,
      WINDOW_SECONDS * 1000,
      abortSignal
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

    BaseHandler.setAuthHeaders(forkingOptions, headers);
    BaseHandler.setUserHeaders(
      forkingOptions,
      headers,
      !url.host.endsWith(".infura.io")
    );
    this.headers = headers;
  }

  /**
   * Adds Authorization headers from the given options to the provided `headers`
   * object. Overwrites an existing `Authorization` header value.
   *
   * @param options
   * @param headers
   */
  static setAuthHeaders(
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
  static setUserHeaders(
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
}
