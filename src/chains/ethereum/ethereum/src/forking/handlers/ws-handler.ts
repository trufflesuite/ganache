import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { AbortError } from "@ganache/ethereum-utils";
import { AbortSignal } from "abort-controller";
import WebSocket from "ws";
import { Handler } from "../types";
import { BaseHandler } from "./base-handler";
import Deferred, { DeferredPromise } from "../deferred";
import { JsonRpcResponse, JsonRpcError } from "@ganache/utils";

export class WsHandler extends BaseHandler implements Handler {
  private open: Promise<unknown>;
  private connection: WebSocket;
  private inFlightRequests = new Map<
    string | number,
    DeferredPromise<{
      response: JsonRpcResponse | JsonRpcError;
      raw: string | Buffer | ArrayBuffer;
    }>
  >();

  constructor(options: EthereumInternalOptions, abortSignal: AbortSignal) {
    super(options, abortSignal);

    const { url, origin } = options.fork;

    this.connection = new WebSocket(url.toString(), {
      origin,
      headers: this.headers
    });

    this.open = this.connect(this.connection);
    this.connection.onclose = () => {
      // try to connect again...
      // TODO: backoff and eventually fail
      this.open = this.connect(this.connection);
    };
    this.abortSignal.addEventListener("abort", () => {
      this.connection.onclose = null;
      this.connection.close(1000);
    });
    this.connection.onmessage = this.onMessage.bind(this);
  }

  public async request(method: string, params: unknown[]) {
    await this.open;
    if (this.abortSignal.aborted) return Promise.reject(new AbortError());

    const key = JSON.stringify({ method, params });
    if (this.requestCache.has(key)) return this.requestCache.get(key);

    const cachedItem = this.valueCache.get(key);
    if (cachedItem) return JSON.parse(cachedItem).result;

    const send = () => {
      if (this.abortSignal.aborted) return Promise.reject(new AbortError());

      const messageId = this.id++;
      const deferred = Deferred<{
        response: JsonRpcResponse | JsonRpcError;
        raw: string | Buffer | ArrayBuffer;
      }>();

      // TODO: timeout an in-flight request after some amount of time
      this.inFlightRequests.set(messageId, deferred);

      this.connection.send(
        BaseHandler.JSONRPC_PREFIX + messageId + `,${key.slice(1)}`
      );
      return deferred.promise.finally(() => this.requestCache.delete(key));
    };
    const promise = this.limiter.handle(send).then(({ response, raw }) => {
      if (this.abortSignal.aborted) return Promise.reject(new AbortError());

      if ("result" in response) {
        // only set the cache for non-error responses
        this.valueCache.set(key, raw as Buffer);

        return response.result;
      } else if ("error" in response) {
        throw response.error;
      }
    });
    this.requestCache.set(key, promise);
    return promise;
  }

  public onMessage(event: WebSocket.MessageEvent) {
    if (event.type !== "message") return;

    // TODO: handle invalid JSON (throws on parse)?
    const result = JSON.parse(event.data as any) as
      | JsonRpcResponse
      | JsonRpcError;
    const id = result.id;
    const prom = this.inFlightRequests.get(id);
    if (prom) {
      this.inFlightRequests.delete(id);
      prom.resolve({ response: result, raw: event.data as any });
    }
  }

  private connect(connection: WebSocket) {
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

  public close() {
    this.connection.close();
    return Promise.resolve();
  }
}
