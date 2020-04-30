import ServerOptions, {getDefault as getDefaultServerOptions} from "./options/server-options";

import uWS, {TemplatedApp, us_listen_socket} from "uWebSockets.js";
import Connector from "./connector";
import WebsocketServer from "./servers/ws-server";
import HttpServer from "./servers/http-server";
import {Flavors} from "./options/provider-options";

export enum Status {
  // These are bit flags
  open = 1,
  opening = 3,
  closed = 4,
  closing = 12
}

export default class Server<T extends ServerOptions = ServerOptions> {
  #app: TemplatedApp;
  #httpServer: HttpServer;
  #listenSocket: us_listen_socket;
  #options: ServerOptions;
  #connector: Flavors;
  #status = Status.closed;
  #websocketServer: WebsocketServer;

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

  async listen(port: number, callback?: (err: Error) => void): Promise<void> {
    const callbackIsFunction = typeof callback === "function";
    let err: Error;
    // if open or opening
    if (this.#status & Status.open) {
      err = new Error(`Server is already listening on port: ${port}`);
      // ensure sure we don't call the `callback` in the current event loop, otherwise an error in the callback would
      // bubble back up into this function. This is a problem here because we aren't awaiting anything
      if (callbackIsFunction) {
        callback = (err: Error) => process.nextTick(callback, err);
      }
    } else {
      this.#status = Status.opening;
      const _listenSocket = await new Promise(resolve => {
        // Make sure we have *exclusive* use of this port.
        // https://github.com/uNetworking/uSockets/commit/04295b9730a4d413895fa3b151a7337797dcb91f#diff-79a34a07b0945668e00f805838601c11R51
        const LIBUS_LISTEN_EXCLUSIVE_PORT = 1;
        this.#app.listen(port, LIBUS_LISTEN_EXCLUSIVE_PORT, resolve);
      });

      if (_listenSocket) {
        this.#status = Status.open;
        this.#listenSocket = _listenSocket;
        err = null;
      } else {
        this.#status = Status.closed;
        err = new Error("Failed to listen on port: " + port);
      }
    }

    // support legacy callback style
    if (callbackIsFunction) {
      callback(err);
    } else if (err) {
      throw err;
    }
  }

  public async close() {
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
    this.#status = Status.closed;
    await this.provider.close();
  }
}
