import uWS, {TemplatedApp, WebSocket} from "uWebSockets.js";
import WebSocketCloseCodes from "./utils/websocket-close-codes";
import ServerOptions, { FlavorMap } from "../options/server-options";
import { PromiEvent } from "@ganache/utils";

type MergePromiseT<Type> = Promise<Type extends Promise<infer X> ? X : never>;

type WebSocketCapableFlavorMap = {
  [k in keyof FlavorMap]: FlavorMap[k]["handle"] extends ((payload: any, connection: WebSocket) => any) ? FlavorMap[k] : never;
};
export type WebSocketCapableFlavor = {
  [k in keyof WebSocketCapableFlavorMap]: WebSocketCapableFlavorMap[k];
}[keyof WebSocketCapableFlavorMap];

export type GanacheWebSocket = WebSocket & {closed?: boolean};

export type WebsocketServerOptions = Pick<ServerOptions, "logger" | "wsBinary">

export default class WebsocketServer {
  #connections = new Map<WebSocket,Set<() => void>>();
  constructor(app: TemplatedApp, connector: WebSocketCapableFlavor, options: WebsocketServerOptions) {
    const connections = this.#connections;
    const wsBinary = options.wsBinary;
    const autoBinary = wsBinary === "auto";
    app.ws("/", {
      /* WS Options */
      compression: uWS.SHARED_COMPRESSOR, // Zero memory overhead compression
      maxPayloadLength: 16 * 1024, // 128 Kibibits
      idleTimeout: 120, // in seconds

      /* Handlers */
      open: (ws: GanacheWebSocket) => {
        ws.closed = false;
        connections.set(ws, new Set());
      },

      message: (ws: GanacheWebSocket, message: ArrayBuffer, isBinary: boolean) => {
        let payload: ReturnType<typeof connector.parse>;
        try {
          payload = connector.parse(Buffer.from(message));
        } catch (e) {
          ws.end(WebSocketCloseCodes.CLOSE_PROTOCOL_ERROR, "Received a malformed frame: " + e.message);
          return;
        }
        
        connector.handle(payload, ws).then(({value}) => {
          // The socket may have closed while we were waiting for the response
          // Don't bother trying to send to it if it was.
          if (ws.closed) return;

          const useBinary = autoBinary ? isBinary : (wsBinary as boolean);

          const resultEmitter = value as MergePromiseT<typeof value>;
          resultEmitter.then(result => {
            if (ws.closed) return;

            const message = connector.format(result, payload);
            ws.send(message, useBinary, true);
          }, err => {
            const message = connector.formatError(err, payload);
            ws.send(message, useBinary, true);
          });
          
          // if the result is an emitter listen to its `"message"` event
          if (resultEmitter instanceof PromiEvent) {
            resultEmitter.on("message", (result: any) => {
              // note: we _don't_ need to check if `ws.closed` here because when
              // `ws.closed` is set we remove this event handler anyway.
              const message = JSON.stringify({jsonrpc: "2.0", method: result.type, params: result.data});
              ws.send(message, isBinary, true);
            });

            // keep track of listeners to dispose off when the ws disconnects
            connections.get(ws).add(resultEmitter.dispose);
          }
        });
      },

      drain: (ws: WebSocket) => {
        // This is there so tests can detect if a small amount of backpressure
        // is happening and that things will still work if it does. We actually
        // don't do anything to manage excessive backpressure.
        options.logger.log("WebSocket backpressure: " + ws.getBufferedAmount());
      },

      close: (ws: GanacheWebSocket) => {
        ws.closed = true;
        connections.get(ws).forEach(dispose => dispose());
        connections.delete(ws);
      }
    });
  }
  close() {
    this.#connections.forEach((_, ws) => ws.end(WebSocketCloseCodes.CLOSE_GOING_AWAY, "Server closed by client"));
  }
}
