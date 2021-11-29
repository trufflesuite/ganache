import { DefaultFlavor, FlavorName } from "@ganache/flavors";
import { ServerOptions } from "@ganache/core";

type CliOptions = {
  host: string;
  port: number;
  callback: any;
};
export type Argv = ServerOptions<FlavorName> & {
  _: [FlavorName];
  server: CliOptions;
};

export type CliSettings = { host: string; port: number };

export type Command = FlavorName | ["$0", typeof DefaultFlavor];
// export type Command = FlavorName | typeof DefaultFlavor;

export type LoggingInformation = {
  data: Array<{
    header: string;
    footer: string;
    data: Array<string>;
  }>;
};
