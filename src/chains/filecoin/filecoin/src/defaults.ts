import {
  OptionsConfig,
  Defaults,
  ServerConfig,
  ServerOptions,
  CliOptions,
  CliConfig
} from "@ganache/flavor";

export type ServerDefaults = Defaults<{
  server: ServerConfig;
}>;
export const ServerDefaults: ServerDefaults = {
  server: {
    ...ServerOptions,
    rpcEndpoint: {
      ...ServerOptions.rpcEndpoint,
      // use all server defaults other than `rpcEndpoint`
      default: () => "/rpc/v0"
    }
  }
};

export type CliDefaults = Defaults<{
  server: CliConfig;
}>;
export const CliDefaults: CliDefaults = {
  server: {
    ...CliOptions,
    port: {
      ...CliOptions.port,
      // use all CLI defaults other than `port`
      default: () => 7777
    }
  }
};

export type CliOptionsConfig = OptionsConfig<{ server: CliConfig }>;
export const CliOptionsConfig: CliOptionsConfig = new OptionsConfig(
  CliDefaults
);

export type ServerOptionsConfig = OptionsConfig<{ server: ServerConfig }>;
export const ServerOptionsConfig: ServerOptionsConfig = new OptionsConfig(
  ServerDefaults
);
