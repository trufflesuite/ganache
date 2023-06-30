import { OptionsConfig } from "@ganache/options";
import { ServerConfig } from "./server-config";
import { serverDefaults } from "./server-defaults";

export type Options = {
  server: ServerConfig;
};
export type ServerOptionsConfig = OptionsConfig<Options>;
export const ServerOptionsConfig = new OptionsConfig(serverDefaults);
