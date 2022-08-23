import { DefaultFlavor, FlavorName } from "@ganache/flavors";
import { ServerOptions } from "@ganache/core";

type CliServerOptions = {
  host: string;
  port: number;
};

type CliOptions = {
  detach: boolean;
};

export type Argv = ServerOptions<FlavorName> & {
  _: [FlavorName];
  server: CliServerOptions;
  cli: CliOptions;
};

export type CliSettings = CliServerOptions;

export type Command = FlavorName | ["$0", typeof DefaultFlavor];
