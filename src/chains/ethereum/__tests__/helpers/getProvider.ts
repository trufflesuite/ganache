import { RequestCoordinator, Executor } from "@ganache/utils/src/utils";
import EthereumProvider from "../../src/provider";
import {ProviderOptions} from "@ganache/options";

const mnemonic = "into trim cross then helmet popular suit hammer cart shrug oval student";
const getProvider = async (options: ProviderOptions = {mnemonic}) => {
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
