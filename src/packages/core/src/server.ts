import {
  InternalOptions,
  serverDefaults,
  ServerOptions,
  serverOptionsConfig
} from "./options";

import allSettled from "promise.allsettled";
import AggregateError from "aggregate-error";
import uWS, {
  TemplatedApp,
  us_listen_socket
} from "@trufflesuite/uws-js-unofficial";
import {
  Connector,
  ConnectorsByName,
  DefaultFlavor,
  FlavorName,
  Options
} from "@ganache/flavors";
import ConnectorLoader from "./connector-loader";
import WebsocketServer, { WebSocketCapableFlavor } from "./servers/ws-server";
import HttpServer from "./servers/http-server";
import Emittery from "emittery";

export type Provider = Connector["provider"];

const DEFAULT_HOST = "127.0.0.1";

export type Callback = (err: Error | null) => void;

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
export enum ServerStatus {
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

/**
 * For private use. May change in the future.
 * I don't don't think these options should be held in this `core` package.
 * @ignore
 */
export const _DefaultServerOptions = serverDefaults;

/**
 * @public
 */
export class Server<
  T extends FlavorName = typeof DefaultFlavor
> extends Emittery<{ open: undefined; close: undefined }> {
  #options: InternalOptions;
  #providerOptions: Options<T>;
  #status: number = ServerStatus.unknown;
  #app: TemplatedApp | null = null;
  #httpServer: HttpServer | null = null;
  #listenSocket: us_listen_socket | null = null;
  #connector: ConnectorsByName[T];
  #websocketServer: WebsocketServer | null = null;

  #initializer: Promise<void>;

  public get provider(): ConnectorsByName[T]["provider"] {
    return this.#connector.provider;
  }

  public get status() {
    return this.#status;
  }

  constructor(
    providerAndServerOptions: ServerOptions<T> = {
      flavor: DefaultFlavor
    } as ServerOptions<T>
  ) {
    super();
    this.#options = serverOptionsConfig.normalize(providerAndServerOptions);
    this.#providerOptions = providerAndServerOptions;
    this.#status = ServerStatus.ready;

    // we need to start initializing now because `initialize` sets the
    // `provider` property... and someone might want to do:
    //   const server = Ganache.server();
    //   const provider = server.provider;
    //   await server.listen(8545)
    const connector = (this.#connector = ConnectorLoader.initialize(
      this.#providerOptions
    ));
    this.#initializer = this.initialize(connector);
  }

  private async initialize(connector: Connector) {
    const _app = (this.#app = uWS.App());

    if (this.#options.server.ws) {
      this.#websocketServer = new WebsocketServer(
        _app,
        connector as WebSocketCapableFlavor,
        this.#options.server
      );
    }
    this.#httpServer = new HttpServer(_app, connector, this.#options.server);

    await (connector as any).once("ready");
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
    if (status === ServerStatus.closing) {
      // if closing
      const err = new Error(`Cannot start server while it is closing.`);
      return callbackIsFunction
        ? process.nextTick(callback!, err)
        : Promise.reject(err);
    } else if ((status & ServerStatus.openingOrOpen) !== 0) {
      // if opening or open
      const err = new Error(
        `Server is already open, or is opening, on port: ${port}.`
      );
      return callbackIsFunction
        ? process.nextTick(callback!, err)
        : Promise.reject(err);
    }

    this.#status = ServerStatus.opening;

    const initializePromise = this.#initializer;

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
        (resolve: (listenSocket: false | uWS.us_listen_socket) => void) => {
          // Make sure we have *exclusive* use of this port.
          // https://github.com/uNetworking/uSockets/commit/04295b9730a4d413895fa3b151a7337797dcb91f#diff-79a34a07b0945668e00f805838601c11R51
          const LIBUS_LISTEN_EXCLUSIVE_PORT = 1;
          hostname
            ? (this.#app as any).listen(
                hostname,
                port,
                LIBUS_LISTEN_EXCLUSIVE_PORT,
                resolve
              )
            : this.#app.listen(port, LIBUS_LISTEN_EXCLUSIVE_PORT, resolve);
        }
      ).then(listenSocket => {
        if (listenSocket) {
          this.#status = ServerStatus.open;
          this.#listenSocket = listenSocket;
        } else {
          this.#status = ServerStatus.closed;
          const err = new Error(
            `listen EADDRINUSE: address already in use ${
              hostname || DEFAULT_HOST
            }:${port}.`
          );
          throw err;
        }
      })
    ]).then(async promiseResults => {
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
        this.#status = ServerStatus.unknown;
        try {
          await this.close();
        } catch (e) {
          errors.push(e);
        }
        if (errors.length > 1) {
          throw new AggregateError(errors);
        } else {
          throw errors[0];
        }
      }
    });

    if (callbackIsFunction) {
      promise.then(() => callback(null)).catch(callback);
    } else {
      return promise;
    }
  }

  public async close() {
    if (this.#status === ServerStatus.opening) {
      // if opening
      throw new Error(`Cannot close server while it is opening.`);
    } else if ((this.#status & ServerStatus.closingOrClosed) !== 0) {
      // if closing or closed
      throw new Error(`Server is already closing or closed.`);
    }

    this.#status = ServerStatus.closing;

    // clean up the websocket objects
    const _listenSocket = this.#listenSocket;
    this.#listenSocket = null;
    // close the socket to prevent any more connections
    if (_listenSocket !== null) {
      uWS.us_listen_socket_close(_listenSocket);
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

    this.#status = ServerStatus.closed;
    this.#app = null;

    await this.emit("close");
  }
}

export default Server;
