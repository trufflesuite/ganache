import type { OptionsConfig } from "@ganache/options";
import type { Executor } from "@ganache/utils";
import type { Connector } from "./connector";

export type CliSettings = { host: string; port: number };

type RemovePropertiesOfType<A, B> = {
  [K in keyof A as A[K] extends B ? never | null : K]: A[K];
};
type Clean<T> = RemovePropertiesOfType<T, never>;

export type FlavorOptions<
  ProviderOptions extends OptionsConfig<any> | never,
  ServerOptions extends OptionsConfig<any> | never,
  CliOptions extends OptionsConfig<any> | never
> = Clean<{
  provider?: ProviderOptions;
  server?: ServerOptions;
  cli?: CliOptions;
}>;

/**
 * A type to represent any flavor. Used internally to generalize flavors.
 * @internal
 */
export type AnyFlavor = Flavor<
  string,
  Connector<any, any, any>,
  {
    provider?: OptionsConfig<any>;
    server?: OptionsConfig<any>;
    cli?: OptionsConfig<any>;
  }
>;

export type Flavor<
  F extends string,
  C extends Connector<any, any, any>,
  O extends FlavorOptions<
    OptionsConfig<any>,
    OptionsConfig<any>,
    OptionsConfig<any>
  > = FlavorOptions<never, never, never>
> = {
  flavor: F;
  connect: (
    providerOptions: Parameters<O["provider"]["normalize"]>[0],
    executor: Executor
  ) => C;
  ready: (config: {
    provider: C["provider"];
    options: {
      server: CliSettings;
    };
  }) => void | Promise<void>;
  options: O;
};
