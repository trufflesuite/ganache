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

import { TruffleColors } from "@ganache/colors";
import chalk from "chalk";

// we need "@ganache/options" in order for TS to properly infer types for `DefaultOptionsByName`
import "@ganache/options";

const NEED_HELP = "Need help? Reach out to the Truffle community at";
const COMMUNITY_LINK = "https://gitter.im/ConsenSys/truffle";

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
          // we print and exit rather than throw to prevent webpack output from being
          // spat out for the line number
          const bold = "\x1b[1m";
          const red = "\x1b[31m";
          const blue = "\x1b[34m";
          const reset = "\x1b[0m";
          console.warn(
            chalk`\n\n{red.bold ERROR:} Could not find Ganache flavor "{bold filecoin}" (@ganache/filecoin); ` +
              `it probably\nneeds to be installed.\n` +
              ` ▸ if you're using Ganache as a library run: \n` +
              chalk`   {blue.bold $ npm install @ganache/filecoin}\n` +
              ` ▸ if you're using Ganache as a CLI run: \n` +
              chalk`   {blue.bold $ npm install --global @ganache/filecoin}\n\n` +
              chalk`{hex("${TruffleColors.porsche}").bold ${NEED_HELP}}\n` +
              chalk`{hex("${TruffleColors.turquoise}") ${COMMUNITY_LINK}}\n\n`
          );
          process.exit(1);
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
