import type { Flavor } from "@ganache/flavor";
import type { ServerOptions } from "@ganache/core";
import type EthereumFlavor from "@ganache/ethereum";

type CliServerOptions = {
  host: string;
  port: number;
};

type Action = "start" | "start-detached" | "list" | "stop";

type AbstractArgs<TAction = Action> = {
  action: TAction;
};

export type StartArgs<
  TFlavorName extends "ethereum" | string,
  F extends Flavor = TFlavorName extends "ethereum" ? EthereumFlavor : Flavor<TFlavorName>
> = ServerOptions<F> & {
  _: [TFlavorName];
  server: CliServerOptions;
  flavor: TFlavorName
} & AbstractArgs<"start" | "start-detached">;

export type GanacheArgs =
  | (AbstractArgs<"stop"> & { name: string })
  | AbstractArgs<"list">
  | StartArgs<"ethereum" | string>;

export type CliSettings = CliServerOptions;

export type Argv<F extends Flavor> = ServerOptions<F> & {
  _: [F["flavor"]];
};
