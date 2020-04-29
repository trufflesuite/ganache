import Executor from "./utils/executor";
import RequestCoordinator from "./utils/request-coordinator";
import ProviderOptions, {FlavorMap} from "./options/provider-options";
import Emittery from "emittery";
import Connector from "./interfaces/connector";
import { Provider } from "./interfaces/provider";
import EthereumApi from "./ledgers/ethereum/api";
import EthereumProvider from "./ledgers/ethereum/provider";

export default class Connector2 extends Emittery {
  // TODO: set missing defaults automatically
  public static initialize(providerOptions: ProviderOptions = {flavor: "ethereum", asyncRequestProcessing: true}) {
    const flavor = providerOptions.flavor || "ethereum";
    const connector = new FlavorMap[flavor](providerOptions);

    // Set up our request coordinator to either use FIFO or or async request processing.
    //   The RequestCoordinator _can_ be used to coordinate the number of requests being processed, but we don't use it
    //   for that (yet), instead of "all" (0) or just 1 as we are doing here:
    const requestCoordinator = new RequestCoordinator(providerOptions.asyncRequestProcessing ? 0 : 1);

    // The Executor is responsible for actually executing the method on the chain/ledger.
    // It performs some safety checks to ensure "safe" method execution.
    const executor = new Executor();

    // The request coordinator is initialized in a "paused" state, when the provider is ready we unpause
    // this lets us accept queue requests before we've even fully initialized.
    (connector.provider as EthereumProvider).on("ready", requestCoordinator.resume);

    // A provider should _not_ execute its own methods, but should delegate that responsiblity here.
    // Need to cast here because of https://github.com/microsoft/TypeScript/issues/7294
    (connector.provider as EthereumProvider).on("request", ({api, method, params}) => {
      return requestCoordinator.queue(executor.execute, api, method, params);
    });

    return connector;
  }
}
