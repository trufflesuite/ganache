import { RequestCoordinator, Executor } from "@ganache/utils";
import { EthereumProvider } from "../../src/provider";
import { EthereumProviderOptions } from "@ganache/ethereum-options";

export const mnemonic =
  "into trim cross then helmet popular suit hammer cart shrug oval student";

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

const getProvider = async (
  options: Writeable<EthereumProviderOptions> = {
    wallet: { mnemonic: mnemonic }
  }
) => {
  options.chain = options.chain || {};
  options.miner = options.miner || {};
  options.logging = options.logging || { logger: { log: () => {} } };

  // set `asyncRequestProcessing` to `true` by default
  let doAsync = options.chain.asyncRequestProcessing;
  doAsync = options.chain.asyncRequestProcessing =
    doAsync != null ? doAsync : true;

  if (!options.miner.instamine) {
    options.miner.instamine = "eager";
  }

  const requestCoordinator = new RequestCoordinator(doAsync ? 0 : 1);
  const executor = new Executor(requestCoordinator);
  const provider = new EthereumProvider(options, executor);
  await provider.initialize();
  requestCoordinator.resume();
  return provider;
};

export default getProvider;
