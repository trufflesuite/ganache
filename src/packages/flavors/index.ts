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
import { utils } from "@ganache/utils";

const NEED_HELP = "Need help? Reach out to the Truffle community at";
const COMMUNITY_LINK = "https://trfl.co/support";

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

export type OptionsByName = {
  [EthereumFlavorName]: EthereumProviderOptions;
  [FilecoinFlavorName]: FilecoinProviderOptions;
};

export type FlavorName = keyof ConnectorsByName;

export type Connector = {
  [K in keyof ConnectorsByName]: ConnectorsByName[K];
}[keyof ConnectorsByName];

export function GetConnector<T extends FlavorName>(
  flavor: T,
  providerOptions: Options<typeof flavor>,
  executor: utils.Executor
): ConnectorsByName[T] {
  if (flavor === DefaultFlavor) {
    return new Ethereum.Connector(
      providerOptions,
      executor
    ) as ConnectorsByName[T];
  }
  try {
    switch (flavor) {
      case FilecoinFlavorName: {
        flavor = "@ganache/filecoin" as any;
        const Connector: Filecoin.Connector = require("@ganache/filecoin")
          .Connector;
        // @ts-ignore
        return new Connector(providerOptions, executor);
      }
      default: {
        // for future plugin compat
        const { Connector } = require(flavor);
        return new Connector(providerOptions, executor);
      }
    }
  } catch (e) {
    if (e.message.includes(`Cannot find module '${flavor}'`)) {
      // we print and exit rather than throw to prevent webpack output from being
      // spat out for the line number
      console.warn(
        chalk`\n\n{red.bold ERROR:} Could not find Ganache flavor "{bold filecoin}" (${flavor}); ` +
          `it probably\nneeds to be installed.\n` +
          ` ▸ if you're using Ganache as a library run: \n` +
          chalk`   {blue.bold $ npm install ${flavor}}\n` +
          ` ▸ if you're using Ganache as a CLI run: \n` +
          chalk`   {blue.bold $ npm install --global ${flavor}}\n\n` +
          chalk`{hex("${TruffleColors.porsche}").bold ${NEED_HELP}}\n` +
          chalk`{hex("${TruffleColors.turquoise}") ${COMMUNITY_LINK}}\n\n`
      );
      process.exit(1);
    } else {
      throw e;
    }
  }
}

export type Providers = Ethereum.Provider | Filecoin.Provider;

type EthereumOptions<T = "ethereum"> = {
  flavor?: T;
} & (EthereumProviderOptions | EthereumLegacyProviderOptions);

type FilecoinOptions<T = "filecoin"> = {
  flavor: T;
} & (FilecoinProviderOptions | FilecoinLegacyProviderOptions);

export type Options<T extends "filecoin" | "ethereum"> = T extends "filecoin"
  ? FilecoinOptions<T>
  : T extends "ethereum"
  ? EthereumOptions<T>
  : never;
