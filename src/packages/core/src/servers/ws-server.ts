import {
  RecognizedString,
  TemplatedApp,
  WebSocket
} from "@trufflesuite/uws-js-unofficial";
import WebSocketCloseCodes from "./utils/websocket-close-codes";
import { InternalOptions } from "../options";
import * as Flavors from "@ganache/flavors";
import { PromiEvent } from "@ganache/utils";
import { types } from "util";

type MergePromiseT<Type> = Promise<Type extends Promise<infer X> ? X : never>;

type HandlesWebSocketSignature = (payload: any, connection: WebSocket) => any;

type WebSocketCapableFlavorMap = {
  [k in keyof Flavors.ConnectorsByName]: Flavors.ConnectorsByName[k]["handle"] extends HandlesWebSocketSignature
    ? Flavors.ConnectorsByName[k]
    : never;
};

function* getFragmentGenerator(
  data: Generator<Buffer, any, unknown>,
  value: Buffer
) {
  // Use a large buffer to reduce round-trips to ws send
  let buf = Buffer.allocUnsafe(WEBSOCKET_BUFFER_SIZE);
  let offset = 0;
  let done = false;
  do {
    const length = value.byteLength;
    if (offset > 0 && length + offset > WEBSOCKET_BUFFER_SIZE) {
      yield buf.subarray(0, offset);
      // Reset the buffer. Since `ws` sends packets asynchronously,
      // it is important that we allocate a new buffer for the next
      // frame. This avoids overwriting data before it is sent. The
      // reason we need to do this is likely because we do not yet
      // handle backpressure. Part of handling backpressure will
      // involve the drain event and only sending while
      // `ws.getBufferedAmount() < ACCEPTABLE_BACKPRESSURE`.
      // See https://github.com/trufflesuite/ganache/issues/2790 and
      // https://github.com/trufflesuite/ganache/issues/2790
      buf = null;
      offset = 0;
    }
    // Store prev in buffer if it fits (but don't store it if it is the exact
    // same size as WEBSOCKET_BUFFER_SIZE)
    if (length < WEBSOCKET_BUFFER_SIZE) {
      // copy from value into buffer
      if (buf === null) buf = Buffer.allocUnsafe(WEBSOCKET_BUFFER_SIZE);
      value.copy(buf, offset, 0, length);
      offset += length;
    } else {
      // Cannot fit this fragment in buffer, send it directly.
      // Buffer has just been flushed so we do not need to worry about
      // out-of-order send.
      yield value;
    }
  } while (({ value, done } = data.next()) && !done);

  // If we've got anything buffered at this point. send it.
  if (offset > 0) yield buf.subarray(0, offset);
}

export function sendFragmented(
  ws: WebSocket,
  data: Generator<Buffer, any, unknown>,
  useBinary: boolean
) {
  ws.cork(() => {
    const { value: first } = data.next();
    // fragment send: https://github.com/uNetworking/uWebSockets.js/issues/635
    const shouldCompress = false;

    const fragments = getFragmentGenerator(data, first);
    // get our first fragment
    const { value: firstFragment } = fragments.next();
    // check if there is any more fragments after this one
    let { value: lastFragment, done } = fragments.next();
    // if there are no more fragments send the "firstFragent" via `send`, as
    // we don't need to chunk it.
    if (done) {
      ws.send(firstFragment as RecognizedString, useBinary);
    } else {
      // since we have at least two fragments send the first one now that it
      // is "full"
      ws.sendFirstFragment(firstFragment as RecognizedString, useBinary);
      // at this point `lastFragment` is the next fragment that should be sent
      // but it might also be our last fragment. If it is, we MUST use
      // `sendLastFragment` to send it. So we iterate over all fragments,
      // sending the _previous_ fragment while caching the current (next)
      // fragment to be send in the next iteration, or via `sendLastFragment`
      // when `nextFragment` is also the last one.
      let nextFragment: Buffer;
      for (nextFragment of fragments) {
        ws.sendFragment(lastFragment as RecognizedString, shouldCompress);
        lastFragment = nextFragment;
      }
      ws.sendLastFragment(lastFragment as RecognizedString, shouldCompress);
    }
  });
}

export type WebSocketCapableFlavor = {
  [k in keyof WebSocketCapableFlavorMap]: WebSocketCapableFlavorMap[k];
}[keyof WebSocketCapableFlavorMap];

export type GanacheWebSocket = WebSocket & { closed?: boolean };

export type WebsocketServerOptions = Pick<
  InternalOptions["server"],
  "wsBinary" | "rpcEndpoint"
>;

// matches geth's limit of 15 MebiBytes: https://github.com/ethereum/go-ethereum/blob/3526f690478482a02a152988f4d31074c176b136/rpc/websocket.go#L40
export const MAX_PAYLOAD_SIZE = 15 * 1024 * 1024;

// When using fragmented send, use a buffer of this size to combine smaller
// fragments returned by the response generator. This reduces round-trips.
export const WEBSOCKET_BUFFER_SIZE = 1024 * 1024; // 1 megabyte

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
        } catch (err: any) {
          // ensure the connector's `handle` fn doesn't throw outside of a Promise

          if (ws.closed) return;
          data = connector.formatError(err, payload);
        }

        if (types.isGeneratorObject(data)) {
          sendFragmented(
            ws,
            data as Generator<Buffer, any, unknown>,
            useBinary
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
