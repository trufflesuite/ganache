// import {TezosConnector} from "@ganache/tezos";
import * as Ethereum from "@ganache/ethereum";

export const DefaultFlavor = Ethereum.FlavorName;

export type ConnectorsByName = {
  [Ethereum.FlavorName]: Ethereum.Connector;
  // [Tezos.FlavorName]: Tezos.Connector
};

export const ConnectorsByName = {
  [Ethereum.FlavorName]: Ethereum.Connector
  // [Tezos.FlavorName]: Tezos.Connector
};

export type Connectors = {
  [K in keyof ConnectorsByName]: ConnectorsByName[K];
}[keyof ConnectorsByName];

export type Providers = Ethereum.Provider /*| Tezos.Provider */;

export type Options = {
  flavor?: typeof Ethereum.FlavorName;
} & Ethereum.ProviderOptions;
// | [Tezos.FlavorName]: Tezos.ProviderOptions;
