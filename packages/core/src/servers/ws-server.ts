import { TemplatedApp } from "@trufflesuite/uws-js-unofficial";
import WebSocketCloseCodes from "./utils/websocket-close-codes";
import { InternalServerOptions } from "../types";
import { PromiEvent } from "@ganache/utils";
import { types } from "util";
import { getFragmentGenerator } from "./utils/fragment-generator";
import type {
  WebsocketConnector,
  RecognizedString,
  WebSocket
} from "@ganache/flavor";

type MergePromiseT<Type> = Promise<Type extends Promise<infer X> ? X : never>;

export function sendFragmented(
  ws: WebSocket,
  data: Generator<Buffer, void, void>,
  useBinary: boolean,
  chunkSize: number
) {
  ws.cork(() => {
    // fragment send: https://github.com/uNetworking/uWebSockets.js/issues/635
    const shouldCompress = false;

    const fragments = getFragmentGenerator(data, chunkSize);
    // get our first fragment
    const { value: firstFragment } = fragments.next();
    // check if there is any more fragments after this one
    let { value: maybeLastFragment, done } = fragments.next();
    // if there are no more fragments send the "firstFragment" via `send`, as
    // we don't need to chunk it.
    if (done) {
      ws.send(firstFragment as RecognizedString, useBinary);
    } else {
      // since we have at least two fragments send the first one now that it
      // is "full"
      ws.sendFirstFragment(firstFragment as RecognizedString, useBinary);
      // at this point `maybeLastFragment` is the next fragment that should be
      // sent. We iterate over all fragments, sending the _previous_ fragment
      // (`maybeLastFragment`) then cache the current fragment (`fragment`)
      // in the `maybeLastFragment` variable, which will be sent in the next
      // iteration, or via `sendLastFragment`, below, if `fragment` was also the
      // very last one.
      for (const fragment of fragments) {
        // definitely not the last fragment, send it!
        ws.sendFragment(maybeLastFragment as RecognizedString, shouldCompress);
        maybeLastFragment = fragment;
      }
      ws.sendLastFragment(
        // definitely the last fragment at this point
        maybeLastFragment as RecognizedString,
        shouldCompress
      );
    }
  });
}

export type GanacheWebSocket = WebSocket & { closed?: boolean };

export type WebsocketServerOptions = Pick<
  InternalServerOptions["server"],
  "wsBinary" | "rpcEndpoint" | "chunkSize"
>;

// matches geth's limit of 15 MebiBytes: https://github.com/ethereum/go-ethereum/blob/3526f690478482a02a152988f4d31074c176b136/rpc/websocket.go#L40
export const MAX_PAYLOAD_SIZE = 15 * 1024 * 1024;

export default class WebsocketServer {
  #connections = new Map<WebSocket, Set<() => void>>();
  constructor(
    app: TemplatedApp,
    connector: WebsocketConnector<any, any, any>,
    options: WebsocketServerOptions
  ) {
    const connections = this.#connections;
    const wsBinary = options.wsBinary;
    const autoBinary = wsBinary === "auto";
    app.ws(options.rpcEndpoint, {
      /* WS Options */

      maxPayloadLength: MAX_PAYLOAD_SIZE,
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
        } catch (err: any) {
          const response = connector.formatError(err, payload);
          ws.send(response, useBinary);
          return;
        }

        let data: RecognizedString | Generator<RecognizedString>;

        try {
          const { value } = await connector.handle(payload, ws);

          // The socket may have closed while we were waiting for the response
          // Don't bother trying to send to it if it was.
          if (ws.closed) return;

          const resultEmitter = value as MergePromiseT<typeof value>;
          const result = await resultEmitter;
          if (ws.closed) return;

          data = connector.format(result, payload);

          // if the result is an emitter listen to its `"message"` event
          // We check if `on` is a function rather than check if
          // `resultEmitter instanceof PromiEvent` because flavor plugins
          // and `ganache` webpack `@ganache/utils` separately. This causes
          // `instanceof` to fail here. Since we know `resultEmitter` is
          // MergePromiseT we can safely assume that if `on` is a function, then
          // we have a PromiEvent
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
        } catch (err: any) {
          // ensure the connector's `handle` fn doesn't throw outside of a Promise

          if (ws.closed) return;
          data = connector.formatError(err, payload);
        }

        if (types.isGeneratorObject(data)) {
          sendFragmented(
            ws,
            data as Generator<Buffer, any, unknown>,
            useBinary,
            options.chunkSize
          );
        } else {
          ws.send(data, useBinary);
        }
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
      ws.end(WebSocketCloseCodes.CLOSE_NORMAL, "Server closed by client")
    );
  }
}
