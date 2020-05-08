import Ganache from "../../src/";
import ProviderOptions from "../../src/options/provider-options";
import EthereumProvider from "@ganache/ethereum/src/provider";

const mnemonic = "into trim cross then helmet popular suit hammer cart shrug oval student";
const GetProvider = (options: ProviderOptions = {flavor: "ethereum", mnemonic}) => {
  return Ganache.provider(options) as EthereumProvider;
};

export default GetProvider;
