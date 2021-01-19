import * as Ethereum from "@ganache/ethereum";
import {
  EthereumDefaults,
  EthereumProviderOptions,
  EthereumLegacyProviderOptions
} from "@ganache/ethereum-options";

import * as Filecoin from "@ganache/filecoin";
import {
  FilecoinDefaults,
  FilecoinProviderOptions,
  FilecoinLegacyProviderOptions
} from "@ganache/filecoin-options";

// we need "@ganache/options" in order for TS to properly infer types for `DefaultOptionsByName`
import "@ganache/options";

export const EthereumFlavorName = "ethereum";
export const FilecoinFlavorName = "filecoin";

export const DefaultFlavor = EthereumFlavorName;

export const DefaultOptionsByName = {
  [EthereumFlavorName]: EthereumDefaults,
  [FilecoinFlavorName]: FilecoinDefaults
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
} & (EthereumProviderOptions | EthereumLegacyProviderOptions);

type FilecoinOptions = {
  flavor?: typeof FilecoinFlavorName;
} & (FilecoinProviderOptions | FilecoinLegacyProviderOptions);

export type Options = EthereumOptions | FilecoinOptions;
