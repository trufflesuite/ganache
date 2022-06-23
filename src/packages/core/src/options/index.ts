import { DefaultFlavor, FlavorName, FlavorOptions } from "@ganache/flavors";
import { ServerConfig, ServerOptions } from "./server-options";
import {
  Defaults,
  Definitions,
  ExternalConfig,
  InternalConfig,
  OptionsConfig
} from "@ganache/options";

/**
 * @public
 */
export type ProviderOptions<T extends FlavorName = typeof DefaultFlavor> =
  FlavorOptions<T>;

export type Options = {
  server: ServerConfig;
};

/**
 * @public
 */
export type ServerOptions<T extends FlavorName = typeof DefaultFlavor> =
  Partial<{
    [K in keyof Options]: ExternalConfig<Options[K]>;
  }> &
    ProviderOptions<T>;

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
