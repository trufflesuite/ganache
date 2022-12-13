import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { AbortError } from "@ganache/ethereum-utils";
import { AbortSignal } from "abort-controller";
import WebSocket from "ws";
import { Handler } from "../types";
import { BaseHandler } from "./base-handler";
import Deferred, { DeferredPromise } from "../deferred";
import { JsonRpcResponse, JsonRpcError } from "@ganache/utils";

const { JSONRPC_PREFIX } = BaseHandler;

export type RetryConfiguration = {
  retryIntervalBaseInSeconds: number;
  retryCounter: number;
};

export class WsHandler extends BaseHandler implements Handler {
  private open: Promise<unknown>;
  private connection: WebSocket;
  private inFlightRequests = new Map<
    string | number,
    DeferredPromise<{
      response: JsonRpcResponse | JsonRpcError;
      raw: string | Buffer;
    }>
  >();

  // queue requests when connection is closed.
  private delayedRequestsQueue = [];
  // flag to identify if adhoc reconnection attempt.
  private adhocReconnectionRequest = false;

  // retry configuration
  private retryCounter: number = 3;
  private retryIntervalBaseInSeconds: number = 2;
  private initialRetryCounter: number;
  private retryTimeoutId: NodeJS.Timeout;

  // socket configuration
  private url: string;
  private origin: string;
  private logging: EthereumInternalOptions["logging"];

  constructor(
    options: EthereumInternalOptions,
    abortSignal: AbortSignal,
    retryConfiguration?: RetryConfiguration | undefined
  ) {
    super(options, abortSignal);

    const {
      fork: { url, origin },
      logging
    } = options;
    this.url = url.toString();
    this.origin = origin;
    this.logging = logging;

    // set retry configuration values
    if (retryConfiguration) {
      this.retryCounter = retryConfiguration.retryCounter;
      this.initialRetryCounter = retryConfiguration.retryIntervalBaseInSeconds;
    }
    this.initialRetryCounter = this.retryCounter;

    const onCloseEvent = () => {
      // try to connect again...
      // backoff and eventually fail
      // do not schedule reconnection for adhoc reconnection requests
      if (this.retryCounter === 0) {
        this.logging.logger.log("Connection to Infura has failed. Try again");
      } else {
        if (!this.adhocReconnectionRequest) {
          this.retryCounter--;
          clearTimeout(this.retryTimeoutId);
          this.retryTimeoutId = setTimeout(async () => {
            this.reconnect(this.url, this.origin, false);
          }, Math.pow(this.retryIntervalBaseInSeconds, this.initialRetryCounter - this.retryCounter) * 1000);
        }
      }
    };
    this.open = this.connect(this.url, this.origin, onCloseEvent);
    this.abortSignal.addEventListener("abort", () => {
      this.connection.onclose = null;
      this.connection.close(1000);
    });
  }

  public async request<T>(
    method: string,
    params: unknown[],
    options = { disableCache: false }
  ) {
    try {
      await this.open;
    } catch (er) {
      this.logging.logger.log("Connection to Infura has failed");
      // skip the reconnection if connection is being made
      if (this.connection.readyState !== this.connection.CONNECTING)
        this.reconnect(this.url, this.origin, true);
    }
    if (this.abortSignal.aborted) return Promise.reject(new AbortError());

    const key = JSON.stringify({ method, params });

    const send = () => {
      if (this.abortSignal.aborted) return Promise.reject(new AbortError());

      const messageId = this.id++;
      const deferred = Deferred<{
        response: JsonRpcResponse | JsonRpcError;
        raw: string | Buffer;
      }>();

      // TODO: timeout an in-flight request after some amount of time
      // Issue: https://github.com/trufflesuite/ganache/issues/3478
      this.inFlightRequests.set(messageId, deferred);

      // if connection is alive send request else delay the request
      const data = `${JSONRPC_PREFIX}${messageId},${key.slice(1)}`;
      if (this.connection && this.connection.readyState === 1) {
        this.connection.send(data);
      } else {
        this.delayRequest(data);
      }
      return deferred.promise.finally(() => this.requestCache.delete(key));
    };
    return await this.queueRequest<T>(method, params, key, send, options);
  }

  public onMessage(event: WebSocket.MessageEvent) {
    if (event.type !== "message") return;

    // data is always a `Buffer` because the websocket's binaryType is set to
    // `nodebuffer`
    const raw = event.data as Buffer;

    // TODO: handle invalid JSON (throws on parse)?
    // Issue: https://github.com/trufflesuite/ganache/issues/3479
    const response = JSON.parse(raw) as JsonRpcResponse | JsonRpcError;
    const id = response.id;
    const prom = this.inFlightRequests.get(id);
    if (prom) {
      this.inFlightRequests.delete(id);
      prom.resolve({ response, raw: raw });
    }
  }

  private connect(url: string, origin: string, onCloseEvent: any) {
    this.connection = new WebSocket(url, {
      origin,
      headers: this.headers
    });
    // `nodebuffer` is already the default, but I just wanted to be explicit
    // here because when `nodebuffer` is the binaryType the `message` event's
    // data type is guaranteed to be a `Buffer`. We don't need to check for
    // different types of data.
    // I mention all this because if `arraybuffer` or `fragment` is used for the
    // binaryType the `"message"` event's `data` may end up being
    // `ArrayBuffer | Buffer`, or `Buffer[] | Buffer`, respectively.
    // If you need to change this, you probably need to change our `onMessage`
    // handler too.
    this.connection.binaryType = "nodebuffer";
    this.connection.onclose = onCloseEvent;
    this.connection.onmessage = this.onMessage.bind(this);
    let open = new Promise((resolve, reject) => {
      this.connection.onopen = resolve;
      this.connection.onerror = reject;
    });
    open.then(() => {
      this.connection.onopen = null;
      this.connection.onerror = null;
      // reset the retry counter and any timeouts scheduled for retries
      this.retryCounter = this.initialRetryCounter;
      clearTimeout(this.retryTimeoutId);

      this.adhocReconnectionRequest = false;
      // process delayed requests which were queued at the time of connection failure
      this.sendDelayedRequests();
    });
    return open;
  }

  private reconnect(
    url: string,
    origin: string,
    adhocReconnectionRequest: boolean = false
  ) {
    this.adhocReconnectionRequest = adhocReconnectionRequest;
    const onCloseEvent = this.connection.onclose;
    this.open = this.connect(url, origin, onCloseEvent);
  }

  private delayRequest(request: any) {
    this.delayedRequestsQueue.push(request);
  }

  private sendDelayedRequests() {
    while (this.delayedRequestsQueue.length > 0) {
      const request = this.delayedRequestsQueue.pop();
      this.connection.send(request);
    }
  }

  public async close() {
    await super.close();
    this.connection.close();
  }
}
