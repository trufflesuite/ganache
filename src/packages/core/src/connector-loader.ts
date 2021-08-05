import { Executor, RequestCoordinator } from "@ganache/utils";
import { DefaultFlavor, FlavorName } from "@ganache/flavors";
import { GetConnector, Options as ProviderOptions } from "@ganache/flavors";

const initialize = <T extends FlavorName = typeof DefaultFlavor>(
  options: ProviderOptions<T> = {
    flavor: DefaultFlavor,
    chain: { asyncRequestProcessing: true }
  } as ProviderOptions<T>
) => {
  const flavor = (options.flavor || DefaultFlavor) as T;

  // Set up our request coordinator to either use FIFO or or async request
  // processing. The RequestCoordinator _can_ be used to coordinate the number
  // of requests being processed, but we don't use it for that (yet), instead
  // of "all" (0) or just 1 as we are doing here:
  const asyncRequestProcessing =
    "chain" in options
      ? options["chain"].asyncRequestProcessing
      : options["asyncRequestProcessing"];
  const requestCoordinator = new RequestCoordinator(
    asyncRequestProcessing ? 0 : 1
  );

  // The Executor is responsible for actually executing the method on the
  // chain/API. It performs some safety checks to ensure "safe" method
  //  execution before passing it to a RequestCoordinator.
  const executor = new Executor(requestCoordinator);

  const connector = GetConnector(flavor, options, executor);

  // Purposely not awaiting on this to prevent a breaking change
  // to the `Ganache.provider()` method
  // TODO: remove the `connector.connect ? ` check and just use
  // `connector.connect()` after publishing the `@ganache/filecoin` with the
  // connector.connect interface
  const connectPromise = connector.connect
    ? connector.connect()
    : (connector as any).initialize();

  // The request coordinator is initialized in a "paused" state; when the
  // provider is ready we unpause.. This lets us accept queue requests before
  // we've even fully initialized.
  connectPromise.then(requestCoordinator.resume);

  return connector;
};

/**
 * Loads the connector specified by the given `flavor`
 */
export default {
  initialize
};
