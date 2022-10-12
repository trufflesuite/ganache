import { DefaultFlavor, Flavor } from "@ganache/flavors";
import { ServerOptions } from "@ganache/core";

export type Argv<F extends Flavor> = ServerOptions<F> & {
  _: [F["flavor"]];
  server: CliSettings;
};

export type CliSettings = { host: string; port: number };

export type Command = string | ["$0", typeof DefaultFlavor];
