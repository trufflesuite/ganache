import { DefaultFlavor, FlavorName } from "@ganache/flavors";
import { ServerOptions } from "@ganache/core";

type CliServerOptions = {
  host: string;
  port: number;
};

type Action = "start" | "start-detached" | "list" | "stop";

type AbstractArgs<TAction = Action> = {
  action: TAction;
};

export type StartArgs<TFlavorName extends FlavorName> =
  ServerOptions<TFlavorName> & {
    _: [TFlavorName];
    server: CliServerOptions;
  } & AbstractArgs<"start" | "start-detached">;

export type GanacheArgs =
  | (AbstractArgs<"stop"> & { name: string })
  | (AbstractArgs<"logs"> & {
      name: string;
      follow?: boolean;
      since?: number;
      until?: number;
    })
  | AbstractArgs<"list">
  | StartArgs<FlavorName>;

export type CliSettings = CliServerOptions;

export type FlavorCommand = FlavorName | ["$0", typeof DefaultFlavor];
