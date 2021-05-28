import { FilecoinProviderOptions } from "@ganache/filecoin-options";
import { utils } from "@ganache/utils";
import FilecoinProvider from "../../src/provider";

const getProvider = async (options?: Partial<FilecoinProviderOptions>) => {
  const requestCoordinator = new utils.RequestCoordinator(0);
  const executor = new utils.Executor(requestCoordinator);
  const provider = new FilecoinProvider(
    {
      chain: {
        ipfsPort: 5002 // Use a different port than the default, to test it works
      },
      logging: {
        logger: {
          log: () => {}
        }
      },
      ...options
    },
    executor
  );
  await provider.initialize();
  requestCoordinator.resume();
  return provider;
};

export default getProvider;
