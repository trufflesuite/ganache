import { Executor, RequestCoordinator } from "@ganache/utils";
import { DefaultFlavor, FlavorName } from "@ganache/flavors";
import { GetConnector, FlavorOptions } from "@ganache/flavors";

const initialize = <T extends FlavorName = typeof DefaultFlavor>(
  options: FlavorOptions<T> = {
    flavor: DefaultFlavor,
    chain: { asyncRequestProcessing: true }
  } as FlavorOptions<T>
) => {
  const flavor = (options.flavor || DefaultFlavor) as T;

  // Set up our request coordinator to either use FIFO or or async request
  // processing. The RequestCoordinator _can_ be used to coordinate the number
  // of requests being processed, but we don't use it for that (yet), instead
  // of "all" (0) or just 1 as we are doing here:
  let asyncRequestProcessing: boolean;

  if ("chain" in options && "asyncRequestProcessing" in options["chain"]) {
    asyncRequestProcessing = options.chain.asyncRequestProcessing;
  } else if ("asyncRequestProcessing" in options) {
    asyncRequestProcessing = options.asyncRequestProcessing;
  } else {
    asyncRequestProcessing = true;
  }
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
    : ((connector as any).initialize() as Promise<void>);

  // The request coordinator is initialized in a "paused" state; when the
  // provider is ready we unpause.. This lets us accept queue requests before
  // we've even fully initialized.

  // The function referenced by requestcoordinator.resume will be changed when
  // requestCoordinator.stop() is called. Ensure that no references to the
  // function are held, otherwise internal errors may be surfaced.
  return {
    connector,
    promise: connectPromise.then(() => requestCoordinator.resume())
  };
};

/**
 * Loads the connector specified by the given `flavor`
 */
export default {
  initialize
};
