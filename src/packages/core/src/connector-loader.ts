import { Executor, RequestCoordinator } from "@ganache/utils";
import type { AnyFlavor } from "@ganache/flavor";
import { load } from "@ganache/flavor";

function getConnector<F extends AnyFlavor>(
  flavorName: F["flavor"],
  providerOptions: Parameters<F["connect"]>[0],
  executor: Executor
): ReturnType<F["connect"]> {
  if (flavorName === "ethereum") {
    // lazy load the ethereum flavor to avoid start up overhead for
    // other flavors.
    return <ReturnType<F["connect"]>>(
      require("@ganache/ethereum").default.connect(providerOptions, executor)
    );
  }
  const flavor = load(flavorName);

  return <ReturnType<F["connect"]>>flavor.connect(providerOptions, executor);
}

/**
 * Loads the connector specified by the given `options.flavor` with the given
 * options, or the `ethereum` flavor is `options.flavor` is not specified.
 * @param options
 * @returns
 */
export const loadConnector = <F extends AnyFlavor = EthereumFlavor>(
  options: Record<string, any> & { flavor?: F["flavor"] } = {
    flavor: EthereumFlavor.flavor
  }
) => {
  const flavor = (options.flavor || EthereumFlavor.flavor) as F["flavor"];

  // Set up our request coordinator to either use FIFO or or async request
  // processing. The RequestCoordinator _can_ be used to coordinate the number
  // of requests being processed, but we don't use it for that (yet), instead
  // of "all" (0) or just 1 as we are doing here:
  let asyncRequestProcessing: boolean;

  if (
    "chain" in options &&
    "asyncRequestProcessing" in (options.chain as any)
  ) {
    asyncRequestProcessing = options.chain["asyncRequestProcessing"];
  } else if ("asyncRequestProcessing" in options) {
    asyncRequestProcessing = options["asyncRequestProcessing"] as boolean;
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

  const connector = getConnector(flavor, options, executor);

  // Purposely not awaiting on this to prevent a breaking change
  // to the `Ganache.provider()` method
  const connectPromise = connector.connect();

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
