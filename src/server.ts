import ServerOptions, {getDefault as getDefaultServerOptions} from "./options/server-options";

export type ServerOptions = ServerOptions;

import uWS, { TemplatedApp, us_listen_socket } from "uWebSockets.js";
import Provider from "./provider";
import WebsocketServer from "./server/websocket-server";
import HttpServer from "./server/http-server";

type JsonRpc = {
  id: string,
  jsonrpc: string,
}

interface JsonRpcRequestPayload extends JsonRpc {
  params: Array<any>
}

interface JsonRpcError {
  code: number,
  message: string
}

interface JsonRpcResponsePayload extends JsonRpc {
  id: string,
  jsonrpc: string,
  result?: any,
  error?: JsonRpcError
}


export default class Server {
  private _options: ServerOptions;
  private _listenSocket: us_listen_socket;
  private _app: TemplatedApp;
  private _provider: Provider;
  private _websocketServer: WebsocketServer;
  private _httpServer: HttpServer;
  constructor(options?: ServerOptions) {
    const _options = this._options = getDefaultServerOptions(options);
    const provider = this._provider = new Provider(_options);

    const app = this._app = uWS.App(null);

    if (_options.ws) {
      this._websocketServer = new WebsocketServer(app, provider);
    }
    this._httpServer = new HttpServer(app, provider);
  }
  
  async listen(port: number, callback?: (err: Error) => void): Promise<void> {
    let err;
    if (this._listenSocket) {
      err = new Error("Server is already listening.");
    } else {
      const listenSocket = await new Promise((resolve) => {
        this._app.listen(port, resolve);
      });
      
      if (listenSocket) {
        this._listenSocket = listenSocket;
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
    const listenSocket = this._listenSocket;
    if (listenSocket) {
      this._listenSocket = undefined;
      // close the socket to prevent any more connections
      uWS.us_listen_socket_close(listenSocket);
      // close all the currently connection websockets:
      this._websocketServer.close()
      this._httpServer.close();
      this._listenSocket = undefined;
    }
  }
}
