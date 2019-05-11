import uWS, { TemplatedApp, WebSocket } from "uWebSockets.js";
import WebSocketCloseCodes from "./utils/websocket-close-codes";
import Provider from "../provider";

const _connections = Symbol("connections");

export default class WebsocketServer {
    private [_connections] = new Set<WebSocket>();
    constructor(app: TemplatedApp, provider: Provider) {
        app.ws("/", {
            /* WS Options */
            compression: uWS.SHARED_COMPRESSOR, // Zero memory overhead compression
            maxPayloadLength: 16 * 1024, // 128 Kibibits
            idleTimeout: 120, // in seconds

            /* Handlers */
            open: (ws: any) => {
                this[_connections].add(ws);
            },
            message: async (ws: any, message: ArrayBuffer, isBinary: boolean) => {
                let payload: any;
                try {
                    payload = JSON.parse(Buffer.from(message) as any);
                } catch (e) {
                    ws.end(WebSocketCloseCodes.CLOSE_PROTOCOL_ERROR, "Received a malformed frame: " + e.message);
                    return;
                }
                const method = payload.method;
                const result = await provider.send(method, payload.params);
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
            /* istanbul ignore next */
            drain: (ws: WebSocket) => {
                /* istanbul ignore next */
                console.log("WebSocket backpressure: " + ws.getBufferedAmount());
            },
            close: (ws: WebSocket) => {
                this[_connections].delete(ws);
                ws.closed = true;
            }
        });
    }
    close() {
        this[_connections].forEach(ws => ws.end(WebSocketCloseCodes.CLOSE_GOING_AWAY, "Server closed by client"));
    }
};
