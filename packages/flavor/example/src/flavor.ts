import type { CliSettings, Flavor } from "../../";
import type { Provider } from "./provider";
import { NotABlockchainChainConnector } from "./connector";
import {
  NotABlockchainChainProviderOptionsConfig,
  NotABlockchainChainProviderOptions
} from "./options";

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
 * const provider: Ganache.provider<NotABlockchainChainFlavor>(options)`
 * ```
 */
type NotABlockchainChainFlavor = Flavor<
  "not-a-blockchain-chain",
  NotABlockchainChainConnector,
  {
    provider: NotABlockchainChainProviderOptionsConfig;
  }
>;

const NotABlockchainChainFlavor: NotABlockchainChainFlavor = {
  flavor: "not-a-blockchain-chain",
  connect: (options: NotABlockchainChainProviderOptions) =>
    new NotABlockchainChainConnector(options),
  options: {
    provider: NotABlockchainChainProviderOptionsConfig
  },
  ready
};

/**
 * Your flavor needs to be exported as `default` so Ganache can find it.
 */
export default NotABlockchainChainFlavor;

async function ready({
  provider,
  options
}: {
  provider: Provider;
  options: { server: CliSettings };
}) {
  console.log(`*********************************`);
  console.log(`Welcome to Not-a-Blockchain-Chain`);
  console.log(`*********************************`);
  console.log();
  console.log(
    `Server is running at http://${options.server.host}:${options.server.port}`
  );
  console.log();

  const blockNumber = await provider.send("blockNumber", []);
  console.log(`The current block number is ${blockNumber}`);
  console.log();
  console.log(`Try a command:`);
  // Note: ganache doesn't currently provide a way for a flavor to access the
  // `server` or its `options`, so there is no way to know if the user has
  // set a non-standard `server.rpcEndpoint` option.
  console.log(
    `curl -X POST --data '${JSON.stringify({
      method: "sendFunds",
      params: [provider.getAccounts()[0], "<a different account>", 99]
    })}' http://${options.server.host}:${options.server.port}`
  );
}
