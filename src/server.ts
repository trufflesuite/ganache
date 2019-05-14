import ServerOptions, {getDefault as getDefaultServerOptions} from "./options/server-options";

export type ServerOptions = ServerOptions;

import uWS, { TemplatedApp, us_listen_socket } from "uWebSockets.js";
import Provider from "./provider";
import WebsocketServer from "./servers/ws-server";
import HttpServer from "./servers/http-server";

const options = Symbol("options");
const listenSocket = Symbol("listenSocket");
const app = Symbol("app");
const websocketServer = Symbol("websocketServer");
const httpServer = Symbol("httpServer");

export enum ConnectionStatus {
  // Flags
  open = 1,
  opening = 3,
  closed = 4,
  closing = 12
}

export default class Server {
  private [app]: TemplatedApp;
  public provider: Provider;
  private [options]: ServerOptions;
  private [httpServer]: HttpServer;
  private [listenSocket]: us_listen_socket;
  private [websocketServer]: WebsocketServer;
  public status = ConnectionStatus.closed;
  
  constructor(serverOptions?: ServerOptions) {
    const opts = this[options] = getDefaultServerOptions(serverOptions);
    const prov = this.provider = new Provider(opts);

    const _app = this[app] = uWS.App(null);

    if (this[options].ws) {
      this[websocketServer] = new WebsocketServer(_app, prov, opts);
    }
    this[httpServer] = new HttpServer(_app, prov);
  }
  
  async listen(port: number, callback?: (err: Error) => void): Promise<void> {
    let err;
    if (this.status & ConnectionStatus.open) {
      err = new Error(`Server is already listening on port: ${port}`);
    } else {
      this.status = ConnectionStatus.opening;
      const _listenSocket = await new Promise((resolve) => {
        this[app].listen(port, resolve);
      });
      
      if (_listenSocket) {
        this.status = ConnectionStatus.open;
        this[listenSocket] = _listenSocket;
        err = null;
      } else {
        this.status = ConnectionStatus.closed;
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

  close() {
    const _listenSocket = this[listenSocket];
    if (_listenSocket) {
      this.status = ConnectionStatus.closing;
      this[listenSocket] = undefined;
      // close the socket to prevent any more connections
      uWS.us_listen_socket_close(_listenSocket);

      // close all the currently connection websockets:
      const ws = this[websocketServer]
      if (ws) {
        ws.close();
      }
      // and do all http cleanup, if any
      this[httpServer].close();
      this.status = ConnectionStatus.closed;
    }
  }
}
