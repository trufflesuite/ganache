/*!
 * @ganache/ethereum
 *
 * @author David Murdoch <david@trufflesuite.com> (https://davidmurdoch.com)
 * @license MIT
 */

import chalk from "chalk";
import { TruffleColors } from "@ganache/colors";
import { WEI } from "@ganache/utils";
import { toChecksumAddress } from "@ethereumjs/util";
import type {
  EthereumLegacyProviderOptions,
  EthereumProviderOptions
} from "@ganache/ethereum-options";
import { EthereumOptionsConfig } from "@ganache/ethereum-options";
import type { CliSettings, Executor, Flavor } from "@ganache/flavor";
import { CliOptionsConfig, ServerOptionsConfig } from "@ganache/flavor";
import type { EthereumProvider } from "./src/provider";
import { Connector } from "./src/connector";

export * from "./src/connector";
export * from "./src/api-types";

function capitalizeFirstLetter(string: string) {
  return string[0].toUpperCase() + string.slice(1);
}
function color(str: string) {
  return chalk`{hex("${TruffleColors.porsche}") ${str}}`;
}

type EthereumFlavor = Flavor<
  "ethereum",
  Connector,
  {
    provider: EthereumOptionsConfig;
    server: ServerOptionsConfig;
    cli: CliOptionsConfig;
  }
>;
const EthereumFlavor: EthereumFlavor = {
  flavor: "ethereum",
  connect: (
    options: EthereumProviderOptions | EthereumLegacyProviderOptions,
    executor: Executor
  ) => new Connector(options, executor),
  options: {
    provider: EthereumOptionsConfig,
    server: ServerOptionsConfig,
    cli: CliOptionsConfig
  },
  ready
};
// flavors are exported as a default export
export default EthereumFlavor;

function ready({
  provider,
  options
}: {
  provider: EthereumProvider;
  options: { server: CliSettings };
}) {
  const liveOptions = provider.getOptions();
  const accounts = provider.getInitialAccounts();

  const addresses = Object.keys(accounts);
  const logs = [];
  logs.push("");
  logs.push("Available Accounts");
  logs.push("==================");
  if (addresses.length > 0) {
    addresses.forEach(function (address, index) {
      const balance = accounts[address].balance;
      const strBalance = balance / WEI;
      const about = balance % WEI === 0n ? "" : "~";
      let line = `(${index}) ${toChecksumAddress(
        address
      )} (${about}${strBalance} ETH)`;

      if (!accounts[address].unlocked) {
        line += " 🔒";
      }

      logs.push(line);
    });

    logs.push("");
    logs.push("Private Keys");
    logs.push("==================");

    addresses.forEach(function (address, index) {
      logs.push(`(${index}) ${accounts[address].secretKey}`);
    });

    if (liveOptions.wallet.accountKeysPath != null) {
      logs.push("");
      logs.push(
        `Accounts and keys saved to ${liveOptions.wallet.accountKeysPath}`
      );
    }
  } else {
    logs.push("(no accounts unlocked)");
  }

  if (liveOptions.wallet.accounts == null) {
    logs.push("");
    logs.push("HD Wallet");
    logs.push("==================");
    logs.push(`Mnemonic:      ${color(liveOptions.wallet.mnemonic)}`);
    logs.push(
      `Base HD Path:  ${color(
        liveOptions.wallet.hdPath.join("/") + "/{account_index}"
      )}`
    );
  }

  if (liveOptions.miner.defaultGasPrice) {
    logs.push("");
    logs.push("Default Gas Price");
    logs.push("==================");
    logs.push(color(liveOptions.miner.defaultGasPrice.toBigInt().toString()));
  }

  if (liveOptions.miner.blockGasLimit) {
    logs.push("");
    logs.push("BlockGas Limit");
    logs.push("==================");
    logs.push(color(liveOptions.miner.blockGasLimit.toBigInt().toString()));
  }

  if (liveOptions.miner.callGasLimit) {
    logs.push("");
    logs.push("Call Gas Limit");
    logs.push("==================");
    logs.push(color(liveOptions.miner.callGasLimit.toBigInt().toString()));
  }

  if (liveOptions.fork.network || liveOptions.fork.url) {
    logs.push("");
    logs.push("Forked Chain");
    logs.push("==================");
    let location: string;
    if (liveOptions.fork.network) {
      location = `Ethereum ${capitalizeFirstLetter(
        liveOptions.fork.network.replace("goerli", "görli")
      )}, via ${chalk`{hex("${TruffleColors.infura}") 丕Infura}`}`;
    } else {
      location = (liveOptions.fork.url as any).toString();
    }

    logs.push(`Location:        ${color(location)}`);
    logs.push(
      `Block:           ${color(liveOptions.fork.blockNumber.toString())}`
    );
    logs.push(
      `Network ID:      ${color(liveOptions.chain.networkId.toString())}`
    );
    logs.push(`Time:            ${color(liveOptions.chain.time.toString())}`);

    if (liveOptions.fork.requestsPerSecond !== 0) {
      logs.push(
        `Requests/Second: ${color(
          liveOptions.fork.requestsPerSecond.toString()
        )}`
      );
    }
  }

  logs.push("");
  logs.push("Chain");
  logs.push("==================");
  logs.push(`Hardfork: ${color(liveOptions.chain.hardfork)}`);
  logs.push(`Id:       ${color(liveOptions.chain.chainId.toString())}`);

  logs.push("");
  logs.push(
    "RPC Listening on " + options.server.host + ":" + options.server.port
  );
  console.log(logs.join("\n"));
}
