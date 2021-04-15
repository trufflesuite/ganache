import { InternalOptions, ServerOptions, serverOptionsConfig } from "./options";

import allSettled from "promise.allsettled";
import AggregateError from "aggregate-error";
import {
  App,
  TemplatedApp,
  us_listen_socket,
  us_listen_socket_close
} from "@trufflesuite/uws-js-unofficial";
import { Connector, DefaultFlavor } from "@ganache/flavors";
import ConnectorLoader from "./connector-loader";
import WebsocketServer, { WebSocketCapableFlavor } from "./servers/ws-server";
import HttpServer from "./servers/http-server";
import Emittery from "emittery";

type Provider = Connector["provider"];

const DEFAULT_HOST = "127.0.0.1";

type Callback = (err: Error | null) => void;

/**
 * Server ready state constants.
 *
 * These are bit flags. This means that you can check if the status is:
 *  * ready: `status === Status.ready` or `status & Status.ready !== 0`
 *  * opening: `status === Status.opening` or `status & Status.opening !== 0`
 *  * open: `status === Status.open` or `status & Status.open !== 0`
 *  * opening || open: `status & Status.openingOrOpen !== 0` or `status & (Status.opening | Status.open) !== 0`
 *  * closing: `status === Status.closing` or `status & Status.closing !== 0`
 *  * closed: `status === Status.closed` or `status & Status.closed !== 0`
 *  * closing || closed: `status & Status.closingOrClosed !== 0` or `status & (Status.closing | Status.closed) !== 0`
 */
export enum Status {
  /**
   * The Server is in an unknown state; perhaps construction didn't succeed
   */
  unknown = 0,
  /**
   * The Server has been constructed and is ready to be opened.
   */
  ready = 1 << 0,
  /**
   * The Server has started to open, but has not yet finished initialization.
   */
  opening = 1 << 1,
  /**
   * The Server is open and ready for connection.
   */
  open = 1 << 2,
  /**
   * The Server is either opening or is already open
   */
  openingOrOpen = (1 << 1) | (1 << 2),
  /**
   * The Server is in the process of closing.
   */
  closing = 1 << 3,
  /**
   * The Server is closed and not accepting new connections.
   */
  closed = 1 << 4,
  /**
   * The Server is either opening or is already open
   */
  closingOrClosed = (1 << 3) | (1 << 4)
}

export class Server extends Emittery<{ open: undefined; close: undefined }> {
  #options: InternalOptions;
  #providerOptions: ServerOptions;
  #status: number = Status.unknown;
  #app: TemplatedApp | null = null;
  #httpServer: HttpServer | null = null;
  #listenSocket: us_listen_socket | null = null;
  #connector: Connector | null = null;
  #websocketServer: WebsocketServer | null = null;

  public get provider(): Provider {
    return this.#connector.provider;
  }

  public get status() {
    return this.#status;
  }

  constructor(providerAndServerOptions: ServerOptions = { flavor: DefaultFlavor }) {
    super();

    this.#options = serverOptionsConfig.normalize(providerAndServerOptions);
    this.#providerOptions = providerAndServerOptions;
    this.#status = Status.ready;
  }

  private async initialize() {
    const connector = (this.#connector = ConnectorLoader.initialize(
      this.#providerOptions
    ));

    const _app = (this.#app = App());

    if (this.#options.server.ws) {
      this.#websocketServer = new WebsocketServer(
        _app,
        connector as WebSocketCapableFlavor,
        this.#options.server
      );
    }
    this.#httpServer = new HttpServer(_app, connector, this.#options.server);

    await connector.once("ready");
  }

  listen(port: number): Promise<void>;
  listen(port: number, host: string): Promise<void>;
  listen(port: number, callback: Callback): void;
  listen(port: number, host: string, callback: Callback): void;
  listen(
    port: number,
    host?: string | Callback,
    callback?: Callback
  ): void | Promise<void> {
    let hostname: string = null;
    if (typeof host === "function") {
      callback = host;
      hostname = null;
    }
    const callbackIsFunction = typeof callback === "function";
    const status = this.#status;
    if (status === Status.closing) {
      // if closing
      const err = new Error(`Cannot start server while it is closing.`);
      return callbackIsFunction
        ? process.nextTick(callback!, err)
        : Promise.reject(err);
    } else if ((status & Status.openingOrOpen) !== 0) {
      // if opening or open
      const err = new Error(`Server is already open, or is opening, on port: ${port}.`);
      return callbackIsFunction
        ? process.nextTick(callback!, err)
        : Promise.reject(err);
    }

    this.#status = Status.opening;

    const initializePromise = this.initialize();

    // This `shim()` is necessary for `Promise.allSettled` to be shimmed
    // in `node@10`. We cannot use `allSettled([...])` directly due to
    // https://github.com/es-shims/Promise.allSettled/issues/5 without
    // upgrading Typescript. TODO: if Typescript is upgraded to 4.2.3+
    // then this line could be removed and `Promise.allSettled` below
    // could replaced with `allSettled`.
    allSettled.shim();

    const promise = Promise.allSettled([
      initializePromise,
      new Promise(
        (resolve: (listenSocket: false | us_listen_socket) => void) => {
          // Make sure we have *exclusive* use of this port.
          // https://github.com/uNetworking/uSockets/commit/04295b9730a4d413895fa3b151a7337797dcb91f#diff-79a34a07b0945668e00f805838601c11R51
          const LIBUS_LISTEN_EXCLUSIVE_PORT = 1;
          hostname
            ? this.#app.listen(
                hostname,
                port,
                LIBUS_LISTEN_EXCLUSIVE_PORT,
                resolve
              )
            : this.#app.listen(port as any, LIBUS_LISTEN_EXCLUSIVE_PORT, resolve);
        }
      ).then(listenSocket => {
        if (listenSocket) {
          this.#status = Status.open;
          this.#listenSocket = listenSocket;
          if (callbackIsFunction) callback!(null);
        } else {
          this.#status = Status.closed;
          const err = new Error(
            `listen EADDRINUSE: address already in use ${
              hostname || DEFAULT_HOST
            }:${port}.`
          );
          if (callbackIsFunction) callback!(err);
          else throw err;
        }
      })
    ]).then(async (promiseResults) => {
      const errors: Error[] = [];

      if (promiseResults[0].status === "rejected") {
        errors.push(promiseResults[0].reason);
      }
      if (promiseResults[1].status === "rejected") {
        errors.push(promiseResults[1].reason);
      }

      if (errors.length === 0) {
        this.emit("open");
      } else {
        this.#status = Status.unknown;
        try {
          await this.close();
        } catch (e) {
          errors.push(e);
        }
        const aggregateError = new AggregateError(errors);
        if (callbackIsFunction) {
          callback!(aggregateError);
        } else {
          throw aggregateError;
        }
      }
    });

    if (!callbackIsFunction) {
      return promise;
    }
  }

  public async close() {
    if (this.#status === Status.opening) {
      // if opening
      throw new Error(`Cannot close server while it is opening.`);
    } else if ((this.#status & Status.closingOrClosed) !== 0) {
      // if closing or closed
      throw new Error(`Server is already closing or closed.`);
    }

    this.#status = Status.closing;

    // clean up the websocket objects
    const _listenSocket = this.#listenSocket;
    this.#listenSocket = null;
    // close the socket to prevent any more connections
    if (_listenSocket !== null) {
      us_listen_socket_close(_listenSocket);
    }
    // close all the connected websockets:
    if (this.#websocketServer !== null) {
      this.#websocketServer.close();
    }

    // and do all http cleanup, if any
    if (this.#httpServer !== null) {
      this.#httpServer.close();
    }

    // cleanup the connector, provider, etc.
    if (this.#connector !== null) {
      await this.#connector.close();
    }

    this.#status = Status.closed;
    this.#app = null;

    await this.emit("close");
  }
}

export default Server;
