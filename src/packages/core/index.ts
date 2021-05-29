// Options is a required import for Api Extractor.
import type { Options } from "@ganache/flavors";

import { ConnectorsByName, DefaultFlavor, FlavorName } from "@ganache/flavors";
import ConnectorLoader from "./src/connector-loader";
import { ProviderOptions, ServerOptions } from "./src/options";
import Server from "./src/server";
export { Server, ServerStatus, _DefaultServerOptions } from "./src/server";

export type { Provider } from "@ganache/flavors";
export type { ProviderOptions, ServerOptions } from "./src/options";

/**
 * @public
 */
const Ganache = {
  /**
   * Creates a Ganache server instance that creates and
   * serves an underlying Ganache provider. Initialization
   * doesn't begin until `server.listen(...)` is called.
   * `server.listen(...)` returns a promise that resolves
   * when initialization is finished.
   *
   * @param options - Configuration options for the server;
   * `options` includes provider based options as well.
   * @returns A provider instance for the flavor
   * `options.flavor` which defaults to `ethereum`.
   */
  server: <T extends FlavorName = typeof DefaultFlavor>(
    options?: ServerOptions<T>
  ) => new Server(options),

  /**
   * Initializes a Web3 provider for a Ganache instance.
   * This function starts an asynchronous task, but does not
   * finish it by the time the function returns. Listen to
   * `provider.on("connect", () => {...})` or wait for
   * `await provider.once("connect")` for initialization to
   * finish. You may start sending requests to the provider
   * before initialization finishes however; these requests
   * will start being consumed after initialization finishes.
   *
   * @param options - Configuration options for the provider.
   * @returns A provider instance for the flavor
   * `options.flavor` which defaults to `ethereum`.
   */
  provider: <T extends FlavorName = typeof DefaultFlavor>(
    options?: ProviderOptions<T>
  ): ConnectorsByName[T]["provider"] => {
    const connector = ConnectorLoader.initialize<T>(options);
    return connector.provider;
  }
};

export const server = Ganache.server;
export const provider = Ganache.provider;
/**
 * @public
 */
export default Ganache;
