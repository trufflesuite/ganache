import {ProviderOptions} from "@ganache/options";
export {Apis, Flavors, FlavorMap} from "@ganache/flavors";

export default interface ServerOptions extends ProviderOptions {
  /**
   * Port number to listen on when running as a server. Defaults to `8545`
   */
  port: number;

  /**
   * Enable a websocket server. This is `true` by default.
   */
  ws: boolean;
}

export const getDefault = (options?: ServerOptions) => {
  return Object.assign(
    {
      port: 8545,
      ws: true
    },
    ProviderOptions.getDefault(options as ProviderOptions)
  ) as ServerOptions;
};
