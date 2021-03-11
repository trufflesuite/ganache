import { InternalOptions, ServerOptions, serverOptionsConfig } from "./options";

import uWS, { TemplatedApp, us_listen_socket } from "uWebSockets.js";
import { Connector, DefaultFlavor } from "@ganache/flavors";
import ConnectorLoader from "./connector-loader";
import WebsocketServer, { WebSocketCapableFlavor } from "./servers/ws-server";
import HttpServer from "./servers/http-server";

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
   * The server is in an unknown state; perhaps construction didn't succeed
   */
  unknown = 0,
  /**
   * The server has been constructed and is ready to be opened is open and ready to communicate.
   */
  ready = 1 << 0,
  /**
   * The server has started to open, but has not yet finished initialization.
   */
  opening = 1 << 1,
  /**
   * The server is open and ready for connection.
   */
  open = 1 << 2,
  /**
   * The server is either opening or is already open
   */
  openingOrOpen = (1 << 1) | (1 << 2),
  /**
   * The server is in the process of closing.
   */
  closing = 1 << 3,
  /**
   * The server is closed and not accepting new connections.
   */
  closed = 1 << 4,
  /**
   * The server is either opening or is already open
   */
  closingOrClosed = (1 << 3) | (1 << 4)
}

export default class Server {
  #options: InternalOptions;
  #providerOptions: any;
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

  constructor(providerAndServerOptions: any = { flavor: DefaultFlavor }) {
    this.#options = serverOptionsConfig.normalize(providerAndServerOptions);
    this.#providerOptions = providerAndServerOptions;
    this.#status = Status.ready;
  }

  async initialize() {
    const connector = (this.#connector = await ConnectorLoader.initialize(
      this.#providerOptions
    ));

    const _app = (this.#app = uWS.App());

    if (this.#options.server.ws) {
      this.#websocketServer = new WebsocketServer(
        _app,
        connector as WebSocketCapableFlavor,
        this.#options.server
      );
    }
    this.#httpServer = new HttpServer(_app, connector);
  }

  listen(port: number, callback: Callback): void;
  listen(port: number, host: string, callback: Callback): void;
  listen(port: number): Promise<void>;
  listen(port: number, host: string): Promise<void>;
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

    const promise = initializePromise.then(() => {
      return new Promise(
        (resolve: (listenSocket: false | uWS.us_listen_socket) => void) => {
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
      });
    }).catch(async error => {
      this.#status = Status.unknown;
      await this.close();
      throw error;
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
    this.#listenSocket = void 0;
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


    this.#status = Status.closed;
    this.#app = void 0;
  }
}
