import * as Ethereum from "@ganache/ethereum";
import { ethereumDefaults } from "@ganache/ethereum-options";
import * as Filecoin from "@ganache/filecoin";
import { filecoinDefaults } from "@ganache/filecoin-options";

// we need "@ganache/options" in order for TS to properly infer types for `DefaultOptionsByName`
import "@ganache/options";

export const EthereumFlavorName = "ethereum";
export const FilecoinFlavorName = "filecoin";

export const DefaultFlavor = EthereumFlavorName;

export const DefaultOptionsByName = {
  [EthereumFlavorName]: ethereumDefaults,
  [FilecoinFlavorName]: filecoinDefaults
};

export type ConnectorsByName = {
  [EthereumFlavorName]: Ethereum.Connector;
  [FilecoinFlavorName]: Filecoin.Connector;
};

export const ConnectorsByName = {
  [EthereumFlavorName]: Ethereum.Connector,
  [FilecoinFlavorName]: Filecoin.Connector
};

export type FlavorName = keyof ConnectorsByName;

export type Connector = {
  [K in keyof ConnectorsByName]: ConnectorsByName[K];
}[keyof ConnectorsByName];

export type Providers = Ethereum.Provider | Filecoin.Provider;

type EthereumOptions = {
  flavor?: typeof EthereumFlavorName;
} & Ethereum.ProviderOptions;

type FilecoinOptions = {
  flavor?: typeof FilecoinFlavorName;
} & Filecoin.ProviderOptions;

export type Options = EthereumOptions | FilecoinOptions;
