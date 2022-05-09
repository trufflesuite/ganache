import {
  Connector as EthereumConnector,
  EthereumProvider
} from "@ganache/ethereum";
export type { EthereumProvider, Ethereum } from "@ganache/ethereum";
export type { FilecoinProvider } from "@ganache/filecoin";
import type { FilecoinConnector, FilecoinProvider } from "@ganache/filecoin";
import {
  EthereumDefaults,
  EthereumProviderOptions,
  EthereumLegacyProviderOptions
} from "@ganache/ethereum-options";
import {
  FilecoinDefaults,
  FilecoinProviderOptions,
  FilecoinLegacyProviderOptions
} from "@ganache/filecoin-options";
import { TruffleColors } from "@ganache/colors";
import chalk from "chalk";

// we need "@ganache/options" in order for TS to properly infer types for `DefaultOptionsByName`
import "@ganache/options";
import { Executor } from "@ganache/utils";

const NEED_HELP = "Need help? Reach out to the Truffle community at";
const COMMUNITY_LINK = "https://trfl.io/support";

export const EthereumFlavorName = "ethereum";
export const FilecoinFlavorName = "filecoin";

export const DefaultFlavor = EthereumFlavorName;

export const DefaultOptionsByName = {
  [EthereumFlavorName]: EthereumDefaults,
  [FilecoinFlavorName]: FilecoinDefaults
};

export type ConnectorsByName = {
  [EthereumFlavorName]: EthereumConnector;
  [FilecoinFlavorName]: FilecoinConnector;
};

export type OptionsByName = {
  [EthereumFlavorName]: EthereumProviderOptions;
  [FilecoinFlavorName]: FilecoinProviderOptions;
};

export type FlavorName = keyof ConnectorsByName;

export type Connector = {
  [K in FlavorName]: ConnectorsByName[K];
}[FlavorName];

export function GetConnector<Flavor extends FlavorName>(
  flavor: Flavor,
  providerOptions: FlavorOptions<typeof flavor>,
  executor: Executor
): ConnectorsByName[Flavor] {
  if (flavor === DefaultFlavor) {
    return new EthereumConnector(
      providerOptions,
      executor
    ) as ConnectorsByName[Flavor];
  }
  try {
    switch (flavor) {
      case FilecoinFlavorName: {
        flavor = "@ganache/filecoin" as any;
        // TODO: remove the `typeof f.default != "undefined" ? ` check once the
        // published filecoin plugin is updated to
        const f = eval("require")(flavor);
        const Connector: FilecoinConnector =
          typeof f.default != "undefined" ? f.default.Connector : f.Connector;
        // @ts-ignore
        return new Connector(providerOptions, executor);
      }
      default: {
        // for future plugin compat
        const { Connector } = require(flavor);
        return new Connector(providerOptions, executor);
      }
    }
  } catch (e: any) {
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

/**
 * @public
 */
export type Provider = EthereumProvider | FilecoinProvider;

type EthereumOptions<T = "ethereum"> = {
  flavor?: T;
} & (EthereumProviderOptions | EthereumLegacyProviderOptions);

type FilecoinOptions<T = "filecoin"> = {
  flavor: T;
} & (FilecoinProviderOptions | FilecoinLegacyProviderOptions);

export type FlavorOptions<T extends "filecoin" | "ethereum"> =
  T extends "filecoin"
    ? FilecoinOptions<T>
    : T extends "ethereum"
    ? EthereumOptions<T>
    : never;
