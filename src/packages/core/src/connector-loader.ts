import { Executor, RequestCoordinator } from "@ganache/utils";
import { ConstructorReturn, Flavor, load } from "@ganache/flavor";
import { FlavorOptions } from "@ganache/flavor";
import EthereumFlavor from "@ganache/ethereum";

function getConnector<F extends Flavor<any, any>>(
  flavor: F["flavor"],
  providerOptions: ConstructorParameters<F["Connector"]>[0],
  executor: Executor
): ConstructorReturn<F["Connector"]> {
  if (flavor === EthereumFlavor.flavor) {
    return <ConstructorReturn<F["Connector"]>>(
      new EthereumFlavor.Connector(providerOptions, executor)
    );
  }
  const { Connector } = load<F>(flavor);
  return <ConstructorReturn<F["Connector"]>>(
    new Connector(providerOptions, executor)
  );
}

/**
 * Loads the connector specified by the given `options.flavor` with the given
 * options, or the `ethereum` flavor is `options.flavor` is not specified.
 * @param options
 * @returns
 */
export const loadConnector = <F extends Flavor = EthereumFlavor>(
  options: FlavorOptions<F> = {
    flavor: EthereumFlavor.flavor,
    chain: { asyncRequestProcessing: true }
  } as FlavorOptions<F>
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
