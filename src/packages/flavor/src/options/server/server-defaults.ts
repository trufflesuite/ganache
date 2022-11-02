import { Defaults } from "@ganache/options";
import { ServerConfig } from "./server-config";
import { ServerOptions } from "./server-options";

export type ServerDefaults = Defaults<{
  server: ServerConfig;
}>;
export const serverDefaults: ServerDefaults = {
  server: ServerOptions
};
