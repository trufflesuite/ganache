import * as Ethereum from "@ganache/ethereum";
import { ethereumDefaults } from "@ganache/ethereum-options";

export const EthereumFlavorName = "ethereum";

export const DefaultFlavor = EthereumFlavorName;

export const DefaultOptionsByName: any = {
  [EthereumFlavorName]: ethereumDefaults
};

export type ConnectorsByName = {
  [EthereumFlavorName]: Ethereum.Connector;
};

export const ConnectorsByName = {
  [EthereumFlavorName]: Ethereum.Connector
};

export type FlavorName = keyof ConnectorsByName;

export type Connector = {
  [K in keyof ConnectorsByName]: ConnectorsByName[K];
}[keyof ConnectorsByName];

export type Providers = Ethereum.Provider;

type EthereumOptions = {
  flavor?: typeof EthereumFlavorName;
} & Ethereum.ProviderOptions;

export type Options = EthereumOptions;
