import type { Flavor } from "@ganache/flavor";
import type EthereumFlavor from "@ganache/ethereum";
import type { ServerOptions } from "@ganache/core";

export type Argv<F extends Flavor> = ServerOptions<F> & {
  _: [F["flavor"]];
  server: CliSettings;
};

export type CliSettings = { host: string; port: number };

export type Command = ["$0"] | ["$0", EthereumFlavor["flavor"]];
