import uWS, { TemplatedApp, WebSocket } from "uWebSockets.js";
import WebSocketCloseCodes from "./utils/websocket-close-codes";
import JsonRpc from "./utils/jsonrpc";
import { IProvider } from "../interfaces/IProvider";
import { ILedger } from "../interfaces/base-ledger";

export default class WebsocketServer<T extends ILedger> {
  #connections = new Set<WebSocket>();
  constructor(app: TemplatedApp, provider: IProvider<T>, options: any) {
    app.ws("/", {
      /* WS Options */
      compression: uWS.SHARED_COMPRESSOR, // Zero memory overhead compression
      maxPayloadLength: 16 * 1024, // 128 Kibibits
      idleTimeout: 120, // in seconds

      /* Handlers */
      open: (ws: any) => {
        this.#connections.add(ws);
      },
      message: async (ws: any, message: ArrayBuffer, isBinary: boolean) => {
        let payload: JsonRpc.Request<T>;
        try {
          payload = JSON.parse(Buffer.from(message) as any);
        } catch (e) {
          ws.end(WebSocketCloseCodes.CLOSE_PROTOCOL_ERROR, "Received a malformed frame: " + e.message);
          return;
        }
        const method = payload.method;
        const result = await provider.request(method, payload.params);
        // The socket may have closed while we were waiting for the response
        // Don't bother trying to send to it now.
        if (!ws.closed) {
          const json = {
            "id": payload.id,
            "jsonrpc": "2.0",
            "result": result
          };
          ws.send(JSON.stringify(json), isBinary, true);
        }
      },
      drain: (ws: WebSocket) => {
        // This is there so tests can detect if a small amount of backpressure is happening and that things will still
        // work if it does. We actually don't do anything to manage excessive backpressure.
        options.logger.log("WebSocket backpressure: " + ws.getBufferedAmount());
      },
      close: (ws: WebSocket) => {
        this.#connections.delete(ws);
        ws.closed = true;
      }
    });
  }
  close() {
    this.#connections.forEach(ws => ws.end(WebSocketCloseCodes.CLOSE_GOING_AWAY, "Server closed by client"));
  }
};
