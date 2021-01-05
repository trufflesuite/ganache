import { utils } from "@ganache/utils";
import EthereumProvider from "../../src/provider";
import { EthereumProviderOptions } from "../../src/options";
const { RequestCoordinator, Executor } = utils;

const mnemonic =
  "into trim cross then helmet popular suit hammer cart shrug oval student";

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

const getProvider = async (
  options: Writeable<EthereumProviderOptions> = {
    wallet: { mnemonic: mnemonic }
  }
) => {
  options.chain = options.chain || {};
  options.logging = options.logging || { logger: { log: () => {} } };

  // set `asyncRequestProcessing` to `true` by default
  let doAsync = options.chain.asyncRequestProcessing;
  doAsync = options.chain.asyncRequestProcessing =
    doAsync != null ? doAsync : true;

  // don't write to stdout in tests
  if (!options.logging.logger) {
    options.logging.logger = { log: () => {} };
  }

  const requestCoordinator = new RequestCoordinator(doAsync ? 0 : 1);
  const executor = new Executor(requestCoordinator);
  const provider = new EthereumProvider(options, executor);
  await new Promise(resolve => {
    provider.on("connect", () => {
      requestCoordinator.resume();
      resolve(void 0);
    });
  });
  return provider;
};

export default getProvider;
