import { RequestCoordinator, Executor } from "@ganache/utils/src/utils";
import EthereumProvider from "../../src/provider";
import {ProviderOptions} from "@ganache/options/src/provider-options";
import EthereumOptions from "@ganache/options/src/chains/ethereum";
import { Provider } from "@ganache/utils/src/types";

type ConvenientOptions = ProviderOptions & EthereumOptions;

const mnemonic = "into trim cross then helmet popular suit hammer cart shrug oval student";
const getProvider = async (options:Partial<ConvenientOptions> = {mnemonic} as Partial<ConvenientOptions>) => {
    const requestCoordinator = new RequestCoordinator(options.asyncRequestProcessing ? 0 : 1);
    const executor = new Executor(requestCoordinator);
    const provider = new EthereumProvider(options, executor);
    await new Promise(resolve => {
      provider.on("connect", () => {
        requestCoordinator.resume();
        resolve();
      })
    });
    return provider;
}

export default getProvider;
