import Options, {getDefault as getDefaultOptions} from "./options";

export default interface ProviderOptions extends Options {
  /**
   * Array of strings to installed subproviders
   */
  subProviders: Array<any>
}

export const getDefault : (options: ProviderOptions) => ProviderOptions = (options) => {
  return Object.assign(
    {
      subProviders: []
    },
    getDefaultOptions(options)
  );
}
