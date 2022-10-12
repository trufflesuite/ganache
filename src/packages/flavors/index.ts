import {
  Connector as EthereumConnector,
  EthereumProvider
} from "@ganache/ethereum";
import { Connector } from "@ganache/utils";
export type { Connector as EthereumConnector } from "@ganache/ethereum";
export type { Connector } from "@ganache/utils";
export type { EthereumProviderOptions } from "@ganache/ethereum-options";
export type { EthereumProvider, Ethereum } from "@ganache/ethereum";
import {
  EthereumDefaults,
  EthereumProviderOptions
} from "@ganache/ethereum-options";
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

export function GetConnector<F extends Flavor>(
  flavor: F["flavor"],
  providerOptions: F["ProviderOptions"],
  executor: Executor
): F["connector"] {
  if (flavor === DefaultFlavor) {
    return new EthereumConnector(providerOptions, executor);
  }
  try {
    if (flavor === "filecoin") {
      flavor = "@ganache/filecoin";
    }
    const f = eval("require")(flavor);
    // TODO: remove the `typeof f.default != "undefined" ? ` check once the
    // published filecoin plugin is updated
    const Connector =
      typeof f.default != "undefined" ? f.default.Connector : f.Connector;
    return new Connector(providerOptions, executor);
  } catch (e: any) {
    if (e.message.includes(`Cannot find module '${flavor}'`)) {
      // we print and exit rather than throw to prevent webpack output from being
      // spat out for the line number
      console.warn(
        chalk`\n\n{red.bold ERROR:} Could not find Ganache flavor "{bold ${flavor}}"; ` +
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
export type Provider = EthereumProvider;

export type FlavorOptions<F extends Flavor> = F["flavor"] extends "ethereum"
  ? EthereumProviderOptions & {
      flavor?: "ethereum";
    }
  : F["ProviderOptions"] & {
      flavor: F["flavor"];
    };
export type Flavor = {
  flavor: string;
  ProviderOptions: {};
  provider: unknown;
  connector: Connector<any, any, any>;
};
