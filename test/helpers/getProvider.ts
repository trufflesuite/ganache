import Ganache from "../../src/";
import Provider from "../../src/provider";
import ProviderOptions from "../../src/options/provider-options";

const mnemonic = "into trim cross then helmet popular suit hammer cart shrug oval student";
const GetProvider = (options: ProviderOptions = {flavor: "ethereum", mnemonic}) => {
  return Ganache.provider(options);
};

export default GetProvider;
export {Provider};
