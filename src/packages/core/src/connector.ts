import {utils} from "@ganache/utils";
import {FlavorMap} from "@ganache/flavors";
import {FlavoredProviderOptions} from "@ganache/options";


/**
 * Loads the connector specified by the given `flavor`
 */
export default {
  // TODO: set missing defaults automatically
  initialize: (providerOptions: FlavoredProviderOptions = {flavor: "ethereum", asyncRequestProcessing: true}) => {
    const flavor = providerOptions.flavor || "ethereum";

    
    // Set up our request coordinator to either use FIFO or or async request processing.
    //   The RequestCoordinator _can_ be used to coordinate the number of requests being processed, but we don't use it
    //   for that (yet), instead of "all" (0) or just 1 as we are doing here:
    const requestCoordinator = new utils.RequestCoordinator(providerOptions.asyncRequestProcessing ? 0 : 1);
    
    // The Executor is responsible for actually executing the method on the chain/ledger.
    // It performs some safety checks to ensure "safe" method execution before passing it
    // to a RequestCoordinator.
    const executor = new utils.Executor(requestCoordinator);

    const connector = new FlavorMap[flavor](providerOptions, executor);

    // The request coordinator is initialized in a "paused" state, when the provider is ready we unpause
    // this lets us accept queue requests before we've even fully initialized.
    connector.on("ready", requestCoordinator.resume);

    return connector;
  }
};
