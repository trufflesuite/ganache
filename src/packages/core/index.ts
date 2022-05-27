import { ConnectorsByName, DefaultFlavor, FlavorName } from "@ganache/flavors";
import { KNOWN_CHAINIDS } from "@ganache/utils";
import ConnectorLoader from "./src/connector-loader";
import { ProviderOptions, ServerOptions } from "./src/options";
import Server from "./src/server";
export { Server, ServerStatus, _DefaultServerOptions } from "./src/server";

export type {
  Provider,
  Ethereum,
  EthereumProvider,
  FilecoinProvider
} from "@ganache/flavors";
export type { ProviderOptions, ServerOptions } from "./src/options";
export type _ExperimentalInfo = Readonly<{
  version: string;
  fork: Readonly<{
    /**
     * Chains Ganache is known to be compatible with. Operations performed
     * locally at historic block numbers will use the Ethereum Virtual Machine
     * OPCODEs, gas prices, and EIPs that were active at the time the historic
     * block originally took place.
     */
    knownChainIds: number[];
  }>;
}>;

const version = process.env.VERSION || "DEV";

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
  provider: <Flavor extends FlavorName = typeof DefaultFlavor>(
    options?: ProviderOptions<Flavor>
  ): ConnectorsByName[Flavor]["provider"] => {
    const loader = ConnectorLoader.initialize<Flavor>(options);
    return loader.connector.provider;
  },
  /**
   *
   * @experimental
   */
  __experimental_info(): _ExperimentalInfo {
    return {
      version,
      fork: {
        knownChainIds: Array.from(KNOWN_CHAINIDS)
      }
    };
  }
};

/**
 * @public
 */
export const server = Ganache.server;
/**
 * @public
 */
export const provider = Ganache.provider;
/**
 * @experimental
 */
export const __experimental_info = Ganache.__experimental_info;
/**
 * @public
 */
export default Ganache;
