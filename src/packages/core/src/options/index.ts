import { Flavor, FlavorOptions } from "@ganache/flavor";
import { ServerConfig, ServerOptions } from "./server-options";
import {
  Defaults,
  Definitions,
  ExternalConfig,
  InternalConfig,
  OptionsConfig
} from "@ganache/options";
import EthereumFlavor from "@ganache/ethereum";

/**
 * @public
 */
export type ProviderOptions<F extends Flavor> = FlavorOptions<F>;

export type Options = {
  server: ServerConfig;
};

/**
 * @public
 */
export type ServerOptions<F extends Flavor = EthereumFlavor> = Partial<{
  [K in keyof Options]: ExternalConfig<Options[K]>;
}> &
  ProviderOptions<F>;

export type InternalOptions = {
  [K in keyof Options]: InternalConfig<Options[K]>;
};

export type ServerDefaults = {
  [K in keyof Options]: Definitions<Options[K]>;
};

export const serverDefaults: Defaults<Options> = {
  server: ServerOptions
};

export const serverOptionsConfig = new OptionsConfig(serverDefaults);
