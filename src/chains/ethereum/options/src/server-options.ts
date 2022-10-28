import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";

export type ServerConfig = {
  options: {
    readonly port: {
      type: number;
      hasDefault: true;
      legacyName: "port";
    };
  };
};

export const ServerOptions: Definitions<ServerConfig> = {
  port: {
    normalize,
    cliDescription: "Default port to listen on",
    default: () => 8545
  }
};
