import type { AnyFlavor } from "@ganache/flavor";
import type EthereumFlavor from "@ganache/ethereum";
import { KNOWN_CHAINIDS } from "@ganache/utils";
import { initializeFlavor } from "./src/connector-loader";
import Server from "./src/server";
import { ProviderOptions, ServerOptions } from "./src/types";
export type { ProviderOptions, ServerOptions } from "./src/types";
export { Server, ServerStatus } from "./src/server";
export type {
  EthereumProvider as Provider,
  EthereumProvider,
  Ethereum
} from "@ganache/ethereum";

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
  server: <F extends AnyFlavor = EthereumFlavor>(
    options?: ServerOptions<F>
  ): Server<F> => new Server<F>(options),

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
  provider: <F extends AnyFlavor = EthereumFlavor>(
    options?: ProviderOptions<F>
  ): ReturnType<F["connect"]>["provider"] => {
    const loader = initializeFlavor<F>(options);
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
