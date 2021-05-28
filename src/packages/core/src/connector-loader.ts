import { utils } from "@ganache/utils";
import {
  DefaultFlavor,
  FlavorName,
  GetConnector,
  Options
} from "@ganache/flavors";

const { Executor } = utils;

const initialize = <T extends FlavorName = typeof DefaultFlavor>(
  options: Options<T> = {
    flavor: DefaultFlavor,
    chain: { asyncRequestProcessing: true }
  } as Options<T>
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
  const requestCoordinator = new utils.RequestCoordinator(
    asyncRequestProcessing ? 0 : 1
  );

  // The Executor is responsible for actually executing the method on the
  // chain/API. It performs some safety checks to ensure "safe" method
  //  execution before passing it to a RequestCoordinator.
  const executor = new Executor(requestCoordinator);

  const connector = GetConnector(flavor, options, executor);

  // Purposely not awaiting on this to prevent a breaking change
  // to the `Ganache.provider()` method
  const connectPromise = connector.connect();

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
