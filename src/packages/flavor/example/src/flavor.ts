import type { Flavor, CliSettings } from "../";
import type { Provider } from "./provider";
import { MyChainConnector } from "./connector";
import { MyChainDefaults, MyChainOptionsConfig } from "./options";

/**
 * It can be useful to create a type for your Flavor that extends Ganache's
 * `Flavor`.
 *
 * It is useful for you, the developer, because Ganache's Flavor type will help
 * guide you on the correct interfaces to implement.
 *
 * It is useful for the end user because they can import your Flavor type when
 * using Ganache programmatically, e.g.,
 * ```
 * const provider: Ganache.provider<MyChainFlavor>(options)`
 * ```
 */
interface MyChainFlavor
  extends Flavor<Provider, MyChainOptionsConfig, MyChainDefaults> {
  /**
   * `flavor` is your package's name. It is used to match the type to the
   * runtime options the user passed in. The runtime implementation of this
   * field, below, isn't currently used by Ganache, but may be in the future.
   */
  flavor: "my-chain";
  /**
   * `connector` is the class that will be instantiated by Ganache to create
   */
  Connector: typeof MyChainConnector;
  /**
   * When Ganache is used via the CLI it will call your `initialize` function
   * with the initialized provider (from the `provider` property from your
   * `Connector`) and the CLI options that were applied.
   * @param provider
   * @param cliArgs
   */
  initialize: typeof initialize;
  /**
   * When Ganache is used via the CLI it will use the default options when
   * generating your help text.
   */
  defaults: MyChainDefaults;

  /**
   * When Ganache is used via the CLI it will use the options config to override
   * Ganache's default start up options, like the `port` and `host`.
   */
  optionsConfig: MyChainOptionsConfig;
}

const MyChainFlavor: MyChainFlavor = {
  flavor: "my-chain",
  Connector: MyChainConnector,
  initialize,
  defaults: MyChainDefaults,
  optionsConfig: MyChainOptionsConfig
};
/**
 * Your flavor needs to be exported as `default` so Ganache can find it.
 */
export default MyChainFlavor;

async function initialize(provider: Provider, cliArgs: CliSettings) {
  console.log(`Server is running at ${cliArgs.host}:${cliArgs.port}`);

  const blockNumber = await provider.send("blockNumber", ["latest"]);
  console.log(`The current block number is ${blockNumber}`);
}
