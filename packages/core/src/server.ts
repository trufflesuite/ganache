import ServerOptions, {getDefault as getDefaultServerOptions} from "./options/server-options";

import uWS, {TemplatedApp, us_listen_socket} from "uWebSockets.js";
import Connector from "./connector";
import WebsocketServer from "./servers/ws-server";
import HttpServer from "./servers/http-server";
import {Flavors} from "./options/provider-options";

type Callback = (err: Error | null) => void

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

export default class Server<T extends ServerOptions = ServerOptions> {
  #app: TemplatedApp;
  #httpServer: HttpServer;
  #listenSocket?: us_listen_socket;
  #options: ServerOptions;
  #connector: Flavors;
  #status = Status.closed;
  #websocketServer: WebsocketServer | null = null;

  public get provider() {
    return this.#connector.provider;
  }

  public get status() {
    return this.#status;
  }

  constructor(serverOptions?: T) {
    const opts = (this.#options = getDefaultServerOptions(serverOptions));
    const connector = (this.#connector = Connector.initialize(opts));

    const _app = (this.#app = uWS.App());

    if (this.#options.ws) {
      this.#websocketServer = new WebsocketServer(_app, connector, opts);
    }
    this.#httpServer = new HttpServer(_app, connector);
  }

  listen(port: number): Promise<void>;
  listen(port: number, callback: Callback): void;
  listen(port: number, callback?: Callback): void | Promise<void> {
    const callbackIsFunction = typeof callback === "function";
    const status = this.#status;
    if (status === Status.closing) {
      // if closing
      const err = new Error(`Cannot start server while it is closing.`);
      return callbackIsFunction ? process.nextTick(callback!, err) : Promise.reject(err);
    } else if (status & Status.open) {
      // if open or opening
      const err = new Error(`Server is already open on port: ${port}.`);
      return callbackIsFunction ? process.nextTick(callback!, err) : Promise.reject(err);
    }

    this.#status = Status.opening;

    const promise = new Promise((resolve: (listenSocket: false | uWS.us_listen_socket) => void) => {
      // Make sure we have *exclusive* use of this port.
      // https://github.com/uNetworking/uSockets/commit/04295b9730a4d413895fa3b151a7337797dcb91f#diff-79a34a07b0945668e00f805838601c11R51
      const LIBUS_LISTEN_EXCLUSIVE_PORT = 1;
      this.#app.listen(port, LIBUS_LISTEN_EXCLUSIVE_PORT, resolve);
    }).then(listenSocket => {
      if (listenSocket) {
        this.#status = Status.open;
        this.#listenSocket = listenSocket;
        if (callbackIsFunction) callback!(null);
      } else {
        this.#status = Status.closed;
        const err = new Error(`Failed to listen on port: ${port}.`);
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
      // if closed or closing
      throw new Error(`Cannot close server while it is opening.`);
    } else if (this.#status & Status.closed) {
      // if closed or closing
      throw new Error(`Server is already closed or closing.`);
    }

    const _listenSocket = this.#listenSocket;
    this.#status = Status.closing;
    if (_listenSocket) {
      this.#listenSocket = undefined;
      // close the socket to prevent any more connections
      uWS.us_listen_socket_close(_listenSocket);
    }
    // close all the connected websockets:
    const ws = this.#websocketServer;
    if (ws) {
      ws.close();
    }

    // and do all http cleanup, if any
    this.#httpServer.close();
    await this.provider.close();
    this.#status = Status.closed;
  }
}
