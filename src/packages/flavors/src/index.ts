// import {TezosConnector} from "@ganache/tezos";
import * as Ethereum from "@ganache/ethereum";

export const DefaultFlavor = Ethereum.FlavorName;

export type ConnectorsByName = {
  [Ethereum.FlavorName]: Ethereum.Connector,
  // [Tezos.FlavorName]: Tezos.Connector
}

export const ConnectorsByName = {
  [Ethereum.FlavorName]: Ethereum.Connector,
  // [Tezos.FlavorName]: Tezos.Connector
}

export type Connectors = {[K in keyof ConnectorsByName]: ConnectorsByName[K]}[keyof ConnectorsByName]

export type Options = (
  ({flavor?: typeof Ethereum.FlavorName} & Ethereum.ProviderOptions)
  // | [Tezos.FlavorName]: Tezos.ProviderOptions;
);

// export type Apis<T extends Flavors = Flavors> = T extends types.Connector<infer R, unknown, unknown> ? R : never;
