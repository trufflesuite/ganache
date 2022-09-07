import { DefaultFlavor, FlavorName } from "@ganache/flavors";
import { ServerOptions } from "@ganache/core";

type CliServerOptions = {
  host: string;
  port: number;
};

export type Argv =
  | (ServerOptions<FlavorName> & {
      _: [FlavorName];
      server: CliServerOptions;
      action: "start" | "detach";
    })
  | { action: "stop"; name: string }
  | { action: "list" };

export type CliSettings = CliServerOptions;

export type Command = FlavorName | ["$0", typeof DefaultFlavor];
