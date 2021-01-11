import * as Ethereum from "@ganache/ethereum";
import { ethereumDefaults } from "@ganache/ethereum-options";

export const DefaultFlavor = Ethereum.FlavorName;

export const DefaultOptionsByName: any = {
  [Ethereum.FlavorName]: ethereumDefaults
};

export type ConnectorsByName = {
  [Ethereum.FlavorName]: Ethereum.Connector;
};

export const ConnectorsByName = {
  [Ethereum.FlavorName]: Ethereum.Connector
};

export type Flavor = keyof ConnectorsByName;

export type Connector = {
  [K in keyof ConnectorsByName]: ConnectorsByName[K];
}[keyof ConnectorsByName];

export type Providers = Ethereum.Provider;

type EthereumOptions = {
  flavor?: typeof Ethereum.FlavorName;
} & Ethereum.ProviderOptions;

export type Options = EthereumOptions;
