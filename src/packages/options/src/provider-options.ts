import {Options, FlavoredOptions} from "./index";
import { Logger } from "@ganache/utils/src/utils";

type ProviderFrameworkOptions = {
  /**
   * Array of strings to installed subproviders
   */
  subProviders?: any[];

  /**
   *
   */
  asyncRequestProcessing?: boolean;

   /**
   * An object, like console, that implements a log() function.
   */
  logger?: Logger

  /**
   * Whether or not to provide aditional logging. Defaults to false.
   */
  verbose?: boolean
}

type ProviderOptions = Options & ProviderFrameworkOptions
type FlavoredProviderOptions = FlavoredOptions & ProviderFrameworkOptions & {flavor:string}

export {
  ProviderOptions,
  FlavoredProviderOptions
};