import { InternalOptions, ServerOptions, serverOptionsConfig } from "./options";

import uWS, { TemplatedApp, us_listen_socket } from "uWebSockets.js";
import { Connectors } from "@ganache/flavors";
import Connector from "./connector";
import WebsocketServer, { WebSocketCapableFlavor } from "./servers/ws-server";
import HttpServer from "./servers/http-server";

type Providers = Connectors["provider"];

const DEFAULT_HOST = "127.0.0.1";

type Callback = (err: Error | null) => void;

/**
 * Server ready state constants.
 *
 * These are bit flags. This means that you can check if the status is:
 *  * open: `status === Status.open`
 *  * opening: `status === Status.opening`
 *  * open || opening: `status & Status.open !== 0` or `status & Status.opening !== 0`
 *  * closed: `status === Status.closed`
 *  * closing: `status === Status.closing`
 *  * open || closing: `status & Status.closed !== 0` or `status & Status.closing !== 0`
 */
export enum Status {
  /**
   * The connection is open and ready to communicate.
   */
  open = 1,
  /**
   * The connection is not yet open.
   */
  opening = 3,
  /**
   * The connection is closed.
   */
  closed = 4,
  /**
   * The connection is in the process of closing.
   */
  closing = 12
}

export default class Server {
  #app: TemplatedApp;
  #httpServer: HttpServer;
  #listenSocket?: us_listen_socket;
  #options: InternalOptions;
  #connector: Connectors;
  #status = Status.closed;
  #websocketServer: WebsocketServer | null = null;

  public get provider(): Providers {
    return this.#connector.provider;
  }

  public get status() {
    return this.#status;
  }

  constructor(serverOptions: ServerOptions = { flavor: "ethereum" }) {
    const opts = (this.#options = serverOptionsConfig.normalize(serverOptions));
    const connector = (this.#connector = Connector.initialize(serverOptions));

    const _app = (this.#app = uWS.App());

    if (this.#options.server.ws) {
      this.#websocketServer = new WebsocketServer(
        _app,
        connector as WebSocketCapableFlavor,
        opts.server
      );
    }
    this.#httpServer = new HttpServer(_app, connector);
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
    } else if (status & Status.open) {
      // if open or opening
      const err = new Error(`Server is already open on port: ${port}.`);
      return callbackIsFunction
        ? process.nextTick(callback!, err)
        : Promise.reject(err);
    }

    this.#status = Status.opening;

    const promise = new Promise(
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

    if (!callbackIsFunction) {
      return promise;
    }
  }

  public async close() {
    if (this.#status === Status.opening) {
      // if opening
      throw new Error(`Cannot close server while it is opening.`);
    } else if (this.#status & Status.closed) {
      // if closed or closing
      throw new Error(`Server is already closed or closing.`);
    }

    const _listenSocket = this.#listenSocket;
    this.#status = Status.closing;
    this.#listenSocket = void 0;
    // close the socket to prevent any more connections
    uWS.us_listen_socket_close(_listenSocket);
    // close all the connected websockets:
    const ws = this.#websocketServer;
    if (ws) {
      ws.close();
    }

    // and do all http cleanup, if any
    this.#httpServer.close();
    await this.#connector.close();
    this.#status = Status.closed;
    this.#app = void 0;
  }
}
