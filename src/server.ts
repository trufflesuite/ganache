import ServerOptions, {getDefault as getDefaultServerOptions} from "./options/server-options";

export type ServerOptions = ServerOptions;

import uWS, { TemplatedApp, us_listen_socket } from "uWebSockets.js";
import Provider from "./provider";
import WebsocketServer from "./servers/ws-server";
import HttpServer from "./servers/http-server";

const options = Symbol("options");
const listenSocket = Symbol("listenSocket");
const app = Symbol("app");
const provider = Symbol("provider");
const websocketServer = Symbol("websocketServer");
const httpServer = Symbol("httpServer");

export default class Server {
  private [app]: TemplatedApp;
  private [provider]: Provider;
  private [options]: ServerOptions;
  private [httpServer]: HttpServer;
  private [listenSocket]: us_listen_socket;
  private [websocketServer]: WebsocketServer;
  
  constructor(serverOptions?: ServerOptions) {
    this[options] = getDefaultServerOptions(serverOptions);
    this[provider] = new Provider(this[options]);

    const _app = this[app] = uWS.App(null);

    if (this[options].ws) {
      this[websocketServer] = new WebsocketServer(_app, this[provider]);
    }
    this[httpServer] = new HttpServer(_app, this[provider]);
  }
  
  async listen(port: number, callback?: (err: Error) => void): Promise<void> {
    let err;
    if (this[listenSocket]) {
      err = new Error("Server is already listening.");
    } else {
      const _listenSocket = await new Promise((resolve) => {
        this[app].listen(port, resolve);
      });
      
      if (_listenSocket) {
        this[listenSocket] = _listenSocket;
        err = null;
      } else {
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
      this[listenSocket] = undefined;
      // close the socket to prevent any more connections
      uWS.us_listen_socket_close(_listenSocket);

      // close all the currently connection websockets:
      this[websocketServer].close()
      // and do all http cleanup, if any
      this[httpServer].close();
    }
  }
}
