import type { AnyFlavor, CliSettings, Flavor } from "@ganache/flavor";
import type { ServerOptions } from "@ganache/core";
import type EthereumFlavor from "@ganache/ethereum";

type Action = "start" | "start-detached" | "list" | "stop";

type AbstractArgs<TAction = Action> = {
  action: TAction;
};

export type StartArgs<
  TFlavorName extends "ethereum" | string,
  F extends AnyFlavor = TFlavorName extends "ethereum"
    ? EthereumFlavor
    : Flavor<TFlavorName, any, any>
> = ServerOptions<F> & {
  _: [TFlavorName];
  server: CliSettings;
  flavor: TFlavorName;
} & AbstractArgs<"start" | "start-detached">;

export type GanacheArgs =
  | (AbstractArgs<"stop"> & { name: string })
  | AbstractArgs<"list">
  | StartArgs<"ethereum" | string>;

export type Argv<F extends AnyFlavor> = ServerOptions<F> & {
  _: [F["flavor"]];
};
