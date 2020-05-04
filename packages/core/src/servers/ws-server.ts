import uWS, {TemplatedApp, WebSocket} from "uWebSockets.js";
import WebSocketCloseCodes from "./utils/websocket-close-codes";
import Connector from "../interfaces/connector";

export default class WebsocketServer {
  #connections = new Set<WebSocket>();
  constructor(app: TemplatedApp, connector: Connector<any>, options: any) {
    app.ws("/", {
      /* WS Options */
      compression: uWS.SHARED_COMPRESSOR, // Zero memory overhead compression
      maxPayloadLength: 16 * 1024, // 128 Kibibits
      idleTimeout: 120, // in seconds

      /* Handlers */
      open: (ws: WebSocket) => {
        this.#connections.add(ws);
      },
      message: async (ws: WebSocket, message: ArrayBuffer, isBinary: boolean) => {
        let payload: ReturnType<typeof connector.parse>;
        try {
          payload = connector.parse(Buffer.from(message));
        } catch (e) {
          ws.end(WebSocketCloseCodes.CLOSE_PROTOCOL_ERROR, "Received a malformed frame: " + e.message);
          return;
        }
        const result = await connector.handle(payload, "ws");
        // The socket may have closed while we were waiting for the response
        // Don't bother trying to send to it if it was.
        if (!ws.closed) {
          const message = connector.format(result, payload);
          ws.send(message, isBinary, true);
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
}
