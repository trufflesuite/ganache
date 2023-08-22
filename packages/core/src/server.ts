import AggregateError from "aggregate-error";
import type {
  TemplatedApp,
  us_listen_socket
} from "@trufflesuite/uws-js-unofficial";
import {
  App,
  us_listen_socket_close,
  us_socket_local_port,
  _cfg as setUwsGlobalConfig
} from "@trufflesuite/uws-js-unofficial";

// Set the "silent" config option so we don't output the "uwebsockets" header
// we check for truthiness because `uws` is omitted from the browser build
setUwsGlobalConfig &&
  setUwsGlobalConfig(new Uint8Array([115, 105, 108, 101, 110, 116]) as any);

import type { AnyFlavor, WebsocketConnector } from "@ganache/flavor";
import { ServerOptionsConfig } from "@ganache/flavor";
import { initializeFlavor } from "./connector-loader";
import WebsocketServer from "./servers/ws-server";
import HttpServer from "./servers/http-server";
import Emittery from "emittery";

// not using the "net" node package in order to avoid having to polyfill this
// for the browser build.
// isIPv4 taken from https://github.com/nodejs/node/blob/01323d50c4b24cf730a651d06ba20633905ecbed/lib/internal/net.js#L31
const v4Seg = "(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])";
const IPv4Reg = new RegExp(`^(${v4Seg}[.]){3}${v4Seg}$`);
const isIPv4 = (s: string) => IPv4Reg.test(s);

export type { Provider } from "../index";
import type EthereumFlavor from "@ganache/ethereum";
import { InternalServerOptions, ServerOptions } from "./types";

const DEFAULT_HOST = "127.0.0.1";

export type Callback = (err: Error | null) => void;

/**
 * Server ready state constants.
 *
 * These are bit flags. This means that you can check if the status is:
 *  * ready: `status === ServerStatus.ready` or `status & ServerStatus.ready !== 0`
 *  * opening: `status === ServerStatus.opening` or `status & ServerStatus.opening !== 0`
 *  * open: `status === ServerStatus.open` or `status & ServerStatus.open !== 0`
 *  * opening || open: `status & ServerStatus.openingOrOpen !== 0` or `status & (ServerStatus.opening | ServerStatus.open) !== 0`
 *  * closing: `status === ServerStatus.closing` or `status & ServerStatus.closing !== 0`
 *  * closed: `status === ServerStatus.closed` or `status & ServerStatus.closed !== 0`
 *  * closing || closed: `status & ServerStatus.closingOrClosed !== 0` or `status & (ServerStatus.closing | ServerStatus.closed) !== 0`
 */
export enum ServerStatus {
  /**
   * The Server is in an unknown state; perhaps construction didn't succeed
   */
  unknown = 0,
  /**
   * The Server has been constructed and is ready to be opened.
   */
  ready = 1 << 0,
  /**
   * The Server has started to open, but has not yet finished initialization.
   */
  opening = 1 << 1,
  /**
   * The Server is open and ready for connection.
   */
  open = 1 << 2,
  /**
   * The Server is either opening or is already open
   */
  openingOrOpen = (1 << 1) | (1 << 2),
  /**
   * The Server is in the process of closing.
   */
  closing = 1 << 3,
  /**
   * The Server is closed and not accepting new connections.
   */
  closed = 1 << 4,
  /**
   * The Server is either opening or is already open
   */
  closingOrClosed = (1 << 3) | (1 << 4)
}

/**
 * @public
 */
export class Server<F extends AnyFlavor = EthereumFlavor> extends Emittery<{
  open: undefined;
  close: undefined;
}> {
  #options: InternalServerOptions;
  #status: number = ServerStatus.unknown;
  #app: TemplatedApp | null = null;
  #httpServer: HttpServer<ReturnType<F["connect"]>> | null = null;
  #listenSocket: us_listen_socket | null = null;
  #host: string | null = null;
  #connector: ReturnType<F["connect"]>;
  #websocketServer: WebsocketServer | null = null;

  #initializer: Promise<void>;

  public get provider(): ReturnType<F["connect"]>["provider"] {
    return this.#connector.provider;
  }

  public get status() {
    return this.#status;
  }

  constructor(
    options: ServerOptions<F> = {
      flavor: "ethereum"
    } as ServerOptions<F>
  ) {
    super();
    this.#status = ServerStatus.ready;

    // we need to start initializing now because the connector's `#provider
    // property must be available to the server immediately... someone might
    // want to do:
    // ```
    // const server = Ganache.server();
    // const provider = server.provider; // this needs to exist
    // await server.listen(8545)
    // ```
    const { flavor, connector, promise } = initializeFlavor<F>(options);
    this.#connector = connector;

    let serverOptions = ServerOptionsConfig.normalize(options);
    // etheruem flavor options are the defaults, so only merge for non-ethereum
    if (flavor.flavor !== "ethereum" && flavor.options.server) {
      serverOptions = {
        ...serverOptions,
        ...flavor.options.server.normalize(options)
      };
    }
    this.#options = serverOptions;

    const _app = (this.#app = App());

    if (serverOptions.server.ws) {
      this.#websocketServer = new WebsocketServer(
        _app,
        <WebsocketConnector<any, any, any>>connector,
        serverOptions.server
      );
    }
    this.#httpServer = new HttpServer(_app, connector, this.#options.server);

    // Since `loadConnector` starts an async promise that we intentionally
    // don't await yet we keep the promise around for `listen` to handle
    // later.
    this.#initializer = promise;
  }

  listen(port: number): Promise<void>;
  listen(port: number, host: string): Promise<void>;
  listen(port: number, callback: Callback): void;
  listen(port: number, host: string, callback: Callback): void;
  listen(
    port: number,
    host?: string | Callback,
    callback?: Callback
  ): void | Promise<void> {
    if (typeof host === "function") {
      callback = host;
      host = null;
    }
    const callbackIsFunction = typeof callback === "function";

    // Method signature specifies port: number, but we parse a string if provided
    // inspiration taken from nodejs internal port validator
    // https://github.com/nodejs/node/blob/8c4b8b201ada6b76d5306c9c7f352e45087fb4a9/lib/internal/validators.js#L208-L219
    if (
      (typeof port !== "number" && typeof port !== "string") ||
      (typeof port === "string" && (<string>port).trim().length === 0) ||
      +port !== +port >>> 0 ||
      port > 0xffff
    ) {
      const err = new Error(
        `Port should be >= 0 and < 65536. Received ${port}.`
      );

      return callbackIsFunction
        ? process.nextTick(callback!, err)
        : Promise.reject(err);
    }
    const portNumber = +port;

    const status = this.#status;
    if (status === ServerStatus.closing) {
      // if closing
      const err = new Error(`Cannot start server while it is closing.`);
      return callbackIsFunction
        ? process.nextTick(callback!, err)
        : Promise.reject(err);
    } else if ((status & ServerStatus.openingOrOpen) !== 0) {
      // if opening or open
      const err = new Error(
        `Server is already open, or is opening, on port: ${portNumber}.`
      );
      return callbackIsFunction
        ? process.nextTick(callback!, err)
        : Promise.reject(err);
    }

    this.#status = ServerStatus.opening;
    const initializer = this.#initializer;

    // don't keep old promises around as they could be holding onto
    // references to things that could otherwise be collected.
    this.#initializer = null;

    const promise = Promise.allSettled([
      initializer,
      new Promise(
        (resolve: (listenSocket: false | us_listen_socket) => void) => {
          // Make sure we have *exclusive* use of this port.
          // https://github.com/uNetworking/uSockets/commit/04295b9730a4d413895fa3b151a7337797dcb91f#diff-79a34a07b0945668e00f805838601c11R51
          const LIBUS_LISTEN_EXCLUSIVE_PORT = 1;
          host
            ? (this.#app as any).listen(
                host as string,
                portNumber,
                LIBUS_LISTEN_EXCLUSIVE_PORT,
                resolve
              )
            : this.#app.listen(
                portNumber,
                LIBUS_LISTEN_EXCLUSIVE_PORT,
                resolve
              );
        }
      ).then(listenSocket => {
        if (listenSocket) {
          this.#status = ServerStatus.open;
          this.#listenSocket = listenSocket;
          this.#host = (host as string) || DEFAULT_HOST;
        } else {
          this.#status = ServerStatus.closed;
          const err = new Error(
            `listen EADDRINUSE: address already in use ${
              host || DEFAULT_HOST
            }:${portNumber}.`
          ) as NodeJS.ErrnoException;
          // emulate part of node's EADDRINUSE error:
          err.code = "EADDRINUSE";
          throw err;
        }
      })
    ]).then(async promiseResults => {
      const errors: Error[] = [];

      if (promiseResults[0].status === "rejected") {
        errors.push(promiseResults[0].reason as Error);
      }
      if (promiseResults[1].status === "rejected") {
        errors.push(promiseResults[1].reason as Error);
      }

      if (errors.length === 0) {
        this.emit("open");
      } else {
        this.#status = ServerStatus.unknown;
        try {
          await this.close();
        } catch (e: any) {
          errors.push(e);
        }
        if (errors.length > 1) {
          throw new AggregateError(errors);
        } else {
          throw errors[0];
        }
      }
    });

    if (callbackIsFunction) {
      promise.then(() => callback(null)).catch(callback);
    } else {
      return promise;
    }
  }

  public address() {
    if (this.#listenSocket) {
      const address = this.#host;
      return {
        address,
        family: isIPv4(address) ? "IPv4" : "IPv6",
        port: us_socket_local_port(this.#listenSocket)
      };
    } else {
      return null;
    }
  }

  public async close() {
    if (this.#status === ServerStatus.opening) {
      // if opening
      throw new Error(`Cannot close server while it is opening.`);
    } else if ((this.#status & ServerStatus.closingOrClosed) !== 0) {
      // if closing or closed
      throw new Error(`Server is already closing or closed.`);
    }

    this.#status = ServerStatus.closing;

    // clean up the websocket objects
    const _listenSocket = this.#listenSocket;
    this.#listenSocket = null;
    // close the socket to prevent any more connections
    if (_listenSocket !== null) {
      us_listen_socket_close(_listenSocket);
    }
    // close all the connected websockets:
    if (this.#websocketServer !== null) {
      this.#websocketServer.close();
    }

    // and do all http cleanup, if any
    if (this.#httpServer !== null) {
      this.#httpServer.close();
    }

    // cleanup the connector, provider, etc.
    if (this.#connector !== null) {
      await this.#connector.close();
    }

    // calling `close()` on the app closes any idle connections immediately,
    // this is neccessary because keepAlive connections can keep the server
    // open indefintely even after the listen socket is closed.
    // TODO: add a `close` is our uws fork fallback:
    (this.#app as any).close && (this.#app as any).close();

    this.#status = ServerStatus.closed;
    this.#app = null;

    await this.emit("close");
  }
}

export default Server;
