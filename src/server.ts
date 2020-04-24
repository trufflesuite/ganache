import ServerOptions, {getDefault as getDefaultServerOptions} from "./options/server-options";

import uWS, { TemplatedApp, us_listen_socket } from "uWebSockets.js";
import Provider from "./provider";
import WebsocketServer from "./servers/ws-server";
import HttpServer from "./servers/http-server";

export enum Status {
  // Flags
  open = 1,
  opening = 3,
  closed = 4,
  closing = 12
}

export default class Server {
  #app: TemplatedApp;
  public provider: Provider;
  #options: ServerOptions;
  #httpServer: HttpServer;
  #listenSocket: us_listen_socket;
  #websocketServer: WebsocketServer;
  public status = Status.closed;
  
  constructor(serverOptions?: ServerOptions) {
    const opts = this.#options = getDefaultServerOptions(serverOptions);
    const prov = this.provider = new Provider(opts);

    const _app = this.#app = uWS.App();

    if (this.#options.ws) {
      this.#websocketServer = new WebsocketServer(_app, prov, opts);
    }
    this.#httpServer = new HttpServer(_app, prov);
  }
  
  async listen(port: number, callback?: (err: Error) => void): Promise<void> {
    let err;
    // if open or opening
    if (this.status & Status.open) {
      err = new Error(`Server is already listening on port: ${port}`);
    } else {
      this.status = Status.opening;
      const _listenSocket = await new Promise((resolve) => {
        // Make sure we have *exclusive* use of this port.
        // https://github.com/uNetworking/uSockets/commit/04295b9730a4d413895fa3b151a7337797dcb91f#diff-79a34a07b0945668e00f805838601c11R51
        const LIBUS_LISTEN_EXCLUSIVE_PORT = 1;
        this.#app.listen(port, LIBUS_LISTEN_EXCLUSIVE_PORT, resolve);
      });
      
      if (_listenSocket) {
        this.status = Status.open;
        this.#listenSocket = _listenSocket;
        err = null;
      } else {
        this.status = Status.closed;
        err = new Error("Failed to listen on port: " + port);
      }
    }

    // support legacy callback style
    if (typeof callback === "function") {
      callback(err);
    } else if (err){
      throw err;
    }
  }

  public async close() {
    const _listenSocket = this.#listenSocket;
    this.status = Status.closing;
    if (_listenSocket) {
      this.#listenSocket = undefined;
      // close the socket to prevent any more connections
      uWS.us_listen_socket_close(_listenSocket);
    }
    // close all the currently connection websockets:
    const ws = this.#websocketServer;
    if (ws) {
      ws.close();
    }
    // and do all http cleanup, if any
    this.#httpServer.close();
    this.status = Status.closed;
    await this.provider.close();
  }
}

