import type {
  Defaults,
  NamespacedOptions,
  OptionsConfig
} from "@ganache/options";
import { ConnectorConstructor } from "./connector";
import { ServerOptionsConfig } from "./options/server/server-options-config";

export type ConstructorReturn<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer I ? I : never;

export type FlavorOptions<F extends Flavor> = ConstructorParameters<
  F["Connector"]
>[0]; // the first argument to the Connector constructor is the options

export type CliSettings = Partial<{
  ws: boolean;
  wsBinary: boolean | "auto";
  rpcEndpoint: string;
  chunkSize: number;
}> & { host: string; port: number };

export type Flavor<
  Provider = any,
  O extends OptionsConfig<any> = any,
  D extends Defaults<any> = any
> = {
  flavor: string;
  Connector: ConnectorConstructor<Provider, any, any>;
  initialize: (
    provider: Provider,
    settings: CliSettings
  ) => void | Promise<void>;
  optionsConfig?: O;
  defaults?: D;
};
