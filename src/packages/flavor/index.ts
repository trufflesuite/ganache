import type { ConnectorConstructor } from "@ganache/utils";
import type { EthereumProviderOptions } from "@ganache/ethereum-options";
import type { Defaults } from "@ganache/options";
export type {
  RecognizedString,
  HttpRequest,
  WebSocket
} from "@trufflesuite/uws-js-unofficial";
export type {
  Connector,
  ConnectorConstructor,
  WebsocketConnector,
  Executor
} from "@ganache/utils";

export type ConstructorReturn<T extends abstract new (...args: any) => any> =
  T extends abstract new (...args: any) => infer I ? I : never;

export type FlavorOptions<F extends Flavor> = F["flavor"] extends "ethereum"
  ? EthereumProviderOptions & {
      flavor?: "ethereum";
    }
  : ConstructorParameters<F["Connector"]>[0];

export type CliSettings = Partial<{
  ws: boolean;
  wsBinary: boolean | "auto";
  rpcEndpoint: string;
  chunkSize: number;
}> & { host: string; port: number };

export type Flavor<P = any, D extends Defaults<any> = any> = {
  flavor: string;
  Connector: ConnectorConstructor<P, any, any>;
  initialize: (provider: P, settings: CliSettings) => void;
  defaults: D;
};
