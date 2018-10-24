import Options from "./options";
import Subprovider from "web3-provider-engine/subproviders/subprovider";

export default class ProviderOptions extends Options {
  /**
   * Array of strings to installed subproviders
   */
  public subProviders: Subprovider[]
}
