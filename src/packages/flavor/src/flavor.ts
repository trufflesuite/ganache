import type { OptionsConfig } from "@ganache/options";
import { Executor } from "..";
import { Connector } from "./connector";

export type CliSettings = Partial<{
  ws: boolean;
  wsBinary: boolean | "auto";
  rpcEndpoint: string;
  chunkSize: number;
}> & { host: string; port: number };

export type FlavorOptions<ProviderOptions extends OptionsConfig<any>,
ServerOptions extends OptionsConfig<any>,
CliOptions extends OptionsConfig<any>> = {
  provider: ProviderOptions extends void ? never : ProviderOptions;
  server: ServerOptions extends void ? never : ServerOptions;
  cli: CliOptions extends void ? never : CliOptions;
};

export type Flavor<
  Name extends string = any,
  C extends Connector<any, any, any> = Connector<any, any, any>,
  ProviderOptions extends OptionsConfig<any> = any,
  ServerOptions extends OptionsConfig<any> = any,
  CliOptions extends OptionsConfig<any> = any
> = {
  flavor: Name;
  connect: (providerOptions: Parameters<ProviderOptions["normalize"]>[0] | null, executor: Executor) => C;
  initialize: (
    provider: C["provider"],
    settings: CliSettings
  ) => void | Promise<void>;
  options: FlavorOptions<ProviderOptions, ServerOptions, CliOptions>;
};
