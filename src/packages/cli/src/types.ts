import { DefaultFlavor, FlavorName } from "@ganache/flavors";
import { ServerOptions } from "@ganache/core";

type CliOptions = {
  host: string;
  port: number;
};
export type Argv = ServerOptions & {
  _: [FlavorName];
  server: CliOptions;
};

export type CliSettings = { host: string; port: number };

export type Command = FlavorName | ["$0", typeof DefaultFlavor];
