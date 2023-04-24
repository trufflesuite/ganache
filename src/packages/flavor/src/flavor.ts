import type { OptionsConfig } from "@ganache/options";
import { Executor } from "..";
import { Connector } from "./connector";

export type CliSettings = { host: string; port: number };

type RemovePropertiesOfType<A, B> = {
  [K in keyof A as A[K] extends B ? never : K]: A[K]
}

export type FlavorOptions<ProviderOptions extends OptionsConfig<any> | never,
ServerOptions extends OptionsConfig<any> | never,
CliOptions extends OptionsConfig<any> | never> = RemovePropertiesOfType<{
  provider: ProviderOptions;
  server: ServerOptions;
  cli: CliOptions;
}, never>;

/**
 * A type to represent any flavor. Used internally to generalize flavors.
 * @internal
 */
export type AnyFlavor = Flavor<string, Connector<any, any, any>, OptionsConfig<any> | null, OptionsConfig<any> | null, OptionsConfig<any> | null>;

export type Flavor<
  Name extends string,
  C extends Connector<any, any, any>,
  ProviderOptions extends OptionsConfig<any> = never,
  ServerOptions extends OptionsConfig<any> = never,
  CliOptions extends OptionsConfig<any> = never
> = {
  flavor: Name;
  connect: (providerOptions: Parameters<ProviderOptions["normalize"]>[0] | null, executor: Executor) => C;
  initialize: (
    provider: C["provider"],
    settings: CliSettings
  ) => void | Promise<void>;
  options: FlavorOptions<ProviderOptions, ServerOptions, CliOptions>;
};
