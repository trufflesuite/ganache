import { RequestCoordinator, Executor } from "@ganache/utils/src/utils";
import FilecoinProvider from "../../src/provider";

const getProvider = async () => {
    const requestCoordinator = new RequestCoordinator(0);
    const executor = new Executor(requestCoordinator);
    const provider = new FilecoinProvider({
      ipfsPort: 5002 // Use a different port than the default, to test it works
    }, executor);
    await new Promise(resolve => {
      provider.on("ready", () => {
        requestCoordinator.resume();
        resolve();
      })
    });
    return provider;
}

export default getProvider;
