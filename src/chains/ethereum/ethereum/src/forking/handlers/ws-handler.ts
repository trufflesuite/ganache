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
    DeferredPromise<JsonRpcResponse | JsonRpcError>
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

    const data = JSON.stringify({ method, params });
    if (this.requestCache.has(data)) {
      //console.log("cache hit: " + data);
      return this.requestCache.get(data);
    }

    const send = () => {
      if (this.abortSignal.aborted) return Promise.reject(new AbortError());

      //console.log("sending request: " + data);
      const messageId = this.id++;
      const deferred = Deferred<JsonRpcResponse | JsonRpcError>();

      // TODO: timeout an in-flight request after some amount of time
      this.inFlightRequests.set(messageId, deferred);

      this.connection.send(
        BaseHandler.JSONRPC_PREFIX + messageId + `,${data.slice(1)}`
      );
      return deferred.promise.finally(() => this.requestCache.delete(data));
    };
    const promise = this.limiter.handle(send).then(result => {
      if (this.abortSignal.aborted) return Promise.reject(new AbortError());

      if ("result" in result) {
        return result.result;
      } else if ("error" in result) {
        throw result.error;
      }
    });
    this.requestCache.set(data, promise);
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
      prom.resolve(result);
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
