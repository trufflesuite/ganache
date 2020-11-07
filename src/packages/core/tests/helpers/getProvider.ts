import Ganache from "../../src/";
import { ProviderOptions } from "@ganache/options";
import { EthereumProvider } from "@ganache/ethereum";

const mnemonic =
  "into trim cross then helmet popular suit hammer cart shrug oval student";
const getProvider = (
  options: ProviderOptions = { flavor: "ethereum", mnemonic }
) => {
  return Ganache.provider(options) as EthereumProvider;
};

export default getProvider;
