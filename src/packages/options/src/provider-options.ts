import {Options, FlavoredOptions} from "./index";

type ProviderFrameworkOptions = {
  /**
   * Array of strings to installed subproviders
   */
  subProviders?: any[];

  /**
   *
   */
  asyncRequestProcessing?: boolean;
}

type ProviderOptions = Options & ProviderFrameworkOptions
type FlavoredProviderOptions = FlavoredOptions & ProviderFrameworkOptions & {flavor:string}

export {
  ProviderOptions,
  FlavoredProviderOptions
};