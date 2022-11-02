import {
  OptionsConfig,
  Defaults,
  ServerConfig,
  ServerOptions
} from "@ganache/flavor";

export type ServerDefaults = Defaults<{
  server: ServerConfig;
}>;
export const ServerDefaults: ServerDefaults = {
  server: {
    ...ServerOptions
  }
};
//@ts-ignore
ServerDefaults.server.rpcEndpoint.default = () => "/rpc/v0";
//@ts-ignore
ServerDefaults.server.port.default = () => 7777;

export type ServerOptionsConfig = OptionsConfig<{ server: ServerConfig }>;
export const ServerOptionsConfig: ServerOptionsConfig = new OptionsConfig(
  ServerDefaults
);
