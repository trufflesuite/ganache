import {
  Connector as EthereumConnector,
  Provider as EthereumProvider
} from "@ganache/ethereum";
import {
  EthereumDefaults,
  EthereumProviderOptions,
  EthereumLegacyProviderOptions
} from "@ganache/ethereum-options";
// import { TezosDefaults, TezosProviderOptions } from "@ganache/tezos-options";
import { TruffleColors } from "@ganache/colors";
import chalk from "chalk";

// we need "@ganache/options" in order for TS to properly infer types for `DefaultOptionsByName`
import "@ganache/options";
import { Executor } from "@ganache/utils";

const NEED_HELP = "Need help? Reach out to the Truffle community at";
const COMMUNITY_LINK = "https://trfl.io/support";

export const EthereumFlavorName = "ethereum";

export const DefaultFlavor = EthereumFlavorName;

export const DefaultOptionsByName = {
  [EthereumFlavorName]: EthereumDefaults
};

export type ConnectorsByName = {
  [EthereumFlavorName]: EthereumConnector;
};

export type OptionsByName = {
  [EthereumFlavorName]: EthereumProviderOptions;
};

export type FlavorName = keyof ConnectorsByName;

export type Connector = {
  [K in keyof ConnectorsByName]: ConnectorsByName[K];
}[keyof ConnectorsByName];

export function GetConnector<T = any>(
  flavor: T,
  providerOptions: Options<typeof flavor>,
  executor: Executor
): unknown {
  if (flavor.toString() === DefaultFlavor) {
    return new EthereumConnector(providerOptions, executor) as unknown;
  }
  try {
    // for future plugin compatibility
    // for backward compatibility, filecoin is also supported along with @ganache/filecoin
    const pluginPackageName =
      flavor.toString() === "filecoin"
        ? "@ganache/" + flavor.toString()
        : flavor.toString();

    const { Connector } = eval("require")(pluginPackageName);
    return new Connector(providerOptions, executor);
  } catch (e: any) {
    if (e.message.includes(`Cannot find module '${flavor}'`)) {
      // we print and exit rather than throw to prevent webpack output from being
      // spat out for the line number
      console.warn(
        chalk`\n\n{red.bold ERROR:} Could not find Ganache flavor (${flavor}); ` +
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
export type Provider = EthereumProvider | any;

type EthereumOptions<T = "ethereum"> = {
  flavor?: T;
} & (EthereumProviderOptions | EthereumLegacyProviderOptions);

export type Options<T = any> = T extends "ethereum" ? EthereumOptions<T> : any;
