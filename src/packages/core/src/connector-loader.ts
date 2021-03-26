import { utils } from "@ganache/utils";
import {
  ConnectorsByName,
  DefaultFlavor,
  DefaultOptionsByName
} from "@ganache/flavors";
import { Options as ProviderOptions } from "@ganache/flavors";
import { hasOwn } from "@ganache/utils/src/utils";
import { Base, Definitions } from "@ganache/options";

/**
 * Loads the connector specified by the given `flavor`
 */
export default {
  initialize: (
    providerOptions: ProviderOptions = {
      flavor: DefaultFlavor,
      chain: { asyncRequestProcessing: true }
    }
  ) => {
    const flavor = providerOptions.flavor || DefaultFlavor;

    // Set up our request coordinator to either use FIFO or or async request processing.
    //   The RequestCoordinator _can_ be used to coordinate the number of requests being processed, but we don't use it
    //   for that (yet), instead of "all" (0) or just 1 as we are doing here:
    const asyncRequestProcessing =
      "chain" in providerOptions
        ? providerOptions.chain.asyncRequestProcessing
        : (providerOptions as any).asyncRequestProcessing;
    const requestCoordinator = new utils.RequestCoordinator(
      asyncRequestProcessing ? 0 : 1
    );

    // The Executor is responsible for actually executing the method on the chain/API.
    // It performs some safety checks to ensure "safe" method execution before passing it
    // to a RequestCoordinator.
    const executor = new utils.Executor(requestCoordinator);

    const connector = new ConnectorsByName[flavor](
      providerOptions as any,
      executor
    );

    // Purposely not awaiting on this to prevent a breaking change
    // to the `Ganache.provider()` method
    connector.initialize();

    // The request coordinator is initialized in a "paused" state; when the provider is ready we unpause.
    // This lets us accept queue requests before we've even fully initialized.
    connector.on("ready", requestCoordinator.resume);

    return connector;
  }
};
