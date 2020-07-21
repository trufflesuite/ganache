import { RequestCoordinator, Executor } from "@ganache/utils/src/utils";
import FilecoinProvider from "../../src/provider";

const getProvider = async () => {
    const requestCoordinator = new RequestCoordinator(0);
    const executor = new Executor(requestCoordinator);
    const provider = new FilecoinProvider({}, executor);
    return provider;
}

export default getProvider;
