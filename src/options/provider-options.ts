import Options, {getDefault as getDefaultOptions} from "./options";

export default interface ProviderOptions extends Options {
  /**
   * Array of strings to installed subproviders
   */
  subProviders: Array<any>
}

export const getDefault : () => ProviderOptions = () => {
  return {
    ...getDefaultOptions(),
    subProviders: []
  } as ProviderOptions;
}
