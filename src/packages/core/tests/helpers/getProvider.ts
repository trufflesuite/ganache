import Ganache from "../../src/";
import { ProviderOptions } from "@ganache/options";
import { EthereumProvider } from "@ganache/ethereum";

const mnemonic =
  "into trim cross then helmet popular suit hammer cart shrug oval student";
const getProvider = async (
  options: ProviderOptions = { flavor: "ethereum", mnemonic }
) => {
  const provider = Ganache.provider(options) as EthereumProvider;
  await provider.once("connect");
  return provider;
};

export default getProvider;
