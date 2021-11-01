import {
  DefaultFlavor,
  FlavorName,
  Options as FlavorOptions
} from "@ganache/flavors";
import { ServerConfig, ServerOptions } from "./server-options";
import {
  Defaults,
  Definitions,
  ExternalConfig,
  InternalConfig,
  OptionsConfig
} from "@ganache/options";

export type { ServerConfig } from "./server-options";

export type ProviderOptions<T = any> = FlavorOptions<T>;

export type Options = {
  server: ServerConfig;
};

export type ServerOptions<T = any> = Partial<
  {
    [K in keyof Options]: ExternalConfig<Options[K]>;
  }
> &
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
