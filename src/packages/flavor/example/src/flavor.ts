import { Flavor } from "../";
import { MyChainConnector } from "./connector";
import {
  MyChainDefaults,
  MyChainOptionsConfig,
  MyChainProviderOptions
} from "./options";
import { Provider } from "./provider";

function initialize(_provider: Provider, cliArgs: any) {
  console.log(`Server is running at ${cliArgs.host}:${cliArgs.port}`);
}

interface MyChainFlavor
  extends Flavor<Provider, MyChainOptionsConfig, MyChainDefaults> {
  flavor: "my-chain";
  Connector: typeof MyChainConnector;
  initialize: typeof initialize;
  defaults: MyChainDefaults;
}

const MyChainFlavor: MyChainFlavor = {
  flavor: "my-chain",
  Connector: MyChainConnector,
  initialize,
  defaults: MyChainDefaults
};
export default MyChainFlavor;
