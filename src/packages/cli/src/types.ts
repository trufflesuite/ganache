import { DefaultFlavor, FlavorName } from "@ganache/flavors";
import { ServerOptions } from "@ganache/core";

type CliOptions = {
  host: string;
  port: number;
};
export type Argv = ServerOptions<FlavorName> & {
  _: [FlavorName];
  server: CliOptions;
};

export type CliSettings = { host: string; port: number };

export type PhoneHomeSettings = {
  hostname: string;
  port: number;
  path: string;
  method: string;
  headers: { "User-Agent": string };
};

export type Command = FlavorName | ["$0", typeof DefaultFlavor];
