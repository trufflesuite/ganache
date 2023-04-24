import type { CliSettings, Executor, Flavor } from "../../";
import type { Provider } from "./provider";
import { MyChainConnector } from "./connector";
import { MyChainOptionsConfig, MyChainProviderOptions } from "./options";

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
type MyChainFlavor = Flavor<
"my-chain", MyChainConnector, MyChainOptionsConfig
>;

const MyChainFlavor: MyChainFlavor = {
  flavor: "my-chain",
  connect: (options: MyChainProviderOptions, executor: Executor) => new MyChainConnector(options, executor),
  options: {
    provider: MyChainOptionsConfig
  },
  initialize
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
