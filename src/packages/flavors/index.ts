import * as Ethereum from "@ganache/ethereum";
import * as Tezos from "@ganache/tezos";
import { ethereumDefaults } from "@ganache/ethereum-options";
import { tezosDefaults } from "@ganache/tezos-options";

// we need "@ganache/options" in order for TS to properly infer types for `DefaultOptionsByName`
import "@ganache/options";

export const EthereumFlavorName = "ethereum";
export const TezosFlavorName = "tezos";

export const DefaultFlavor = EthereumFlavorName;

export const DefaultOptionsByName = {
  [EthereumFlavorName]: ethereumDefaults,
  [TezosFlavorName]: tezosDefaults
};

export type ConnectorsByName = {
  [EthereumFlavorName]: Ethereum.Connector;
  [TezosFlavorName]: Tezos.Connector;
};

export const ConnectorsByName = {
  [EthereumFlavorName]: Ethereum.Connector,
  [TezosFlavorName]: Tezos.Connector
};

export type FlavorName = keyof ConnectorsByName;

export type Connector = {
  [K in keyof ConnectorsByName]: ConnectorsByName[K];
}[keyof ConnectorsByName];

export type Providers = Ethereum.Provider | Tezos.Provider;

type EthereumOptions = {
  flavor?: typeof EthereumFlavorName;
} & Ethereum.ProviderOptions;

type TezosOptions = {
  flavor?: typeof TezosFlavorName;
} & Tezos.ProviderOptions;

export type Options = EthereumOptions | TezosOptions;
