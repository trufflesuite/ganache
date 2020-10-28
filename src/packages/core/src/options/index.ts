import { Options as FlavorOptions } from "@ganache/flavors";
import { ServerConfig, ServerOptions } from "./server-options";
import {
  Defaults,
  Definitions,
  ExternalConfig,
  InternalConfig,
  OptionsConfig
} from "@ganache/options";

export type ProviderOptions = FlavorOptions;

export type Options = {
  server: ServerConfig;
};

export type ServerOptions = Partial<
  {
    [K in keyof Options]: ExternalConfig<Options[K]>;
  }
> &
  ProviderOptions;

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
