import { RecognizedString, TemplatedApp, WebSocket } from "@trufflesuite/uws-js-unofficial";
import WebSocketCloseCodes from "./utils/websocket-close-codes";
import { InternalOptions } from "../options";
import * as Flavors from "@ganache/flavors";
import { PromiEvent } from "@ganache/utils";

type MergePromiseT<Type> = Promise<Type extends Promise<infer X> ? X : never>;

type HandlesWebSocketSignature = (payload: any, connection: WebSocket) => any;

type WebSocketCapableFlavorMap = {
  [k in keyof Flavors.ConnectorsByName]: Flavors.ConnectorsByName[k]["handle"] extends HandlesWebSocketSignature
    ? Flavors.ConnectorsByName[k]
    : never;
};

export type WebSocketCapableFlavor = {
  [k in keyof WebSocketCapableFlavorMap]: WebSocketCapableFlavorMap[k];
}[keyof WebSocketCapableFlavorMap];

export type GanacheWebSocket = WebSocket & { closed?: boolean };

export type WebsocketServerOptions = Pick<
  InternalOptions["server"],
  "wsBinary" | "rpcEndpoint"
>;

export default class WebsocketServer {
  #connections = new Map<WebSocket, Set<() => void>>();
  constructor(
    app: TemplatedApp,
    connector: WebSocketCapableFlavor,
    options: WebsocketServerOptions
  ) {
    const connections = this.#connections;
    const wsBinary = options.wsBinary;
    const autoBinary = wsBinary === "auto";
    app.ws(options.rpcEndpoint, {
      /* WS Options */
      maxPayloadLength: 16 * 1024, // 128 Kibibits
      idleTimeout: 120, // in seconds

      // Note that compression is disabled (the default option)
      // due to not being able to link against electron@12
      // with compression included

      /* Handlers */
      open: (ws: GanacheWebSocket) => {
        ws.closed = false;
        connections.set(ws, new Set());
      },

      message: async (
        ws: GanacheWebSocket,
        message: ArrayBuffer,
        isBinary: boolean
      ) => {
        // We have to use type any instead of ReturnType<typeof connector.parse>
        // on `payload` because Typescript isn't smart enough to understand the
        // ambiguity doesn't actually exist
        let payload: any;
        const useBinary = autoBinary ? isBinary : (wsBinary as boolean);
        try {
          payload = connector.parse(Buffer.from(message));
        } catch (err) {
          const response = connector.formatError(err, payload);
          ws.send(response, useBinary);
          return;
        }

        let response: RecognizedString;

        try {
          const { value } = await connector.handle(payload, ws);

          // The socket may have closed while we were waiting for the response
          // Don't bother trying to send to it if it was.
          if (ws.closed) return;

          const resultEmitter = value as MergePromiseT<typeof value>;
          const result = await resultEmitter;
          if (ws.closed) return;

          response = connector.format(result, payload);

          // if the result is an emitter listen to its `"message"` event
          // We check if `on` is a function rather than check if
          // `resultEmitter instanceof PromiEvent` because `@ganache/filecoin`
          // and `ganache` webpack `@ganache/utils` separately. This causes
          // instanceof to fail here. Since we know `resultEmitter` is MergePromiseT
          // we can safely assume that if `on` is a function, then we have a PromiEvent
          if (typeof resultEmitter["on"] === "function") {
            const resultEmitterPromiEvent = resultEmitter as PromiEvent<any>;
            resultEmitterPromiEvent.on("message", (result: any) => {
              // note: we _don't_ need to check if `ws.closed` here because when
              // `ws.closed` is set we remove this event handler anyway.
              const message = JSON.stringify({
                jsonrpc: "2.0",
                method: result.type,
                params: result.data
              });
              ws.send(message, isBinary);
            });

            // keep track of listeners to dispose off when the ws disconnects
            connections.get(ws).add(resultEmitterPromiEvent.dispose);
          }
        } catch (err) {
          // ensure the connector's `handle` fn doesn't throw outside of a Promise

          if (ws.closed) return;
          response = connector.formatError(err, payload);
        }

        ws.send(response, useBinary);
      },

      drain: (ws: WebSocket) => {
        // This is there so tests can detect if a small amount of backpressure
        // is happening and that things will still work if it does. We actually
        // don't do anything to manage excessive backpressure.
        // TODO: handle back pressure for real!
        // options.logger.log("WebSocket backpressure: " + ws.getBufferedAmount());
      },

      close: (ws: GanacheWebSocket) => {
        ws.closed = true;
        connections.get(ws).forEach(dispose => dispose());
        connections.delete(ws);
      }
    });
  }
  close() {
    this.#connections.forEach((_, ws) =>
      ws.end(WebSocketCloseCodes.CLOSE_GOING_AWAY, "Server closed by client")
    );
  }
}
