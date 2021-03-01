import { utils } from "@ganache/utils";
import TezosProvider from "../../src/provider";
import { TezosProviderOptions } from "@ganache/tezos-options";
const { RequestCoordinator, Executor } = utils;

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

const getProvider = async (
  options: Writeable<TezosProviderOptions> = {
    wallet: { totalAccounts: 3, defaultBalance: 100 }
  }
) => {
  const requestCoordinator = new RequestCoordinator(0);
  const executor = new Executor(requestCoordinator);
  const provider = new TezosProvider(options, executor);
  await new Promise(resolve => {
    provider.on("connect", () => {
      requestCoordinator.resume();
      resolve(void 0);
    });
  });
  return provider;
};

export default getProvider;
