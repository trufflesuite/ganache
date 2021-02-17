import * as Ethereum from "@ganache/ethereum";
import {
  EthereumDefaults,
  EthereumProviderOptions,
  EthereumLegacyProviderOptions
} from "@ganache/ethereum-options";

import * as Filecoin from "@ganache/filecoin-types";
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

export type FlavorName = keyof ConnectorsByName;

export type Connector = {
  [K in keyof ConnectorsByName]: ConnectorsByName[K];
}[keyof ConnectorsByName];

export function GetConnector(
  flavor: FlavorName,
  providerOptions: any,
  executor
): Connector {
  switch (flavor) {
    case DefaultFlavor:
      return new Ethereum.Connector(providerOptions, executor);
    case FilecoinFlavorName:
      try {
        const connector: Filecoin.Connector = require("@ganache/filecoin")
          .Connector;
        // @ts-ignore
        return new connector(providerOptions, executor);
      } catch (e) {
        if (e.message.includes("Cannot find module '@ganache/filecoin'")) {
          throw new Error(
            "Could not find module @ganache/filecoin peer dependency; please run `npm install @ganache/filecoin` if you're using as a library or `npm install --global @ganache/filecoin` if you're using in the Ganache CLI"
          );
        } else {
          throw e;
        }
      }
  }
}

export type Providers = Ethereum.Provider | Filecoin.Provider;

type EthereumOptions = {
  flavor?: typeof EthereumFlavorName;
} & (EthereumProviderOptions | EthereumLegacyProviderOptions);

type FilecoinOptions = {
  flavor?: typeof FilecoinFlavorName;
} & (FilecoinProviderOptions | FilecoinLegacyProviderOptions);

export type Options = EthereumOptions | FilecoinOptions;
