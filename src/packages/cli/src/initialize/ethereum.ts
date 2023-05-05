import chalk from "chalk";
import { TruffleColors } from "@ganache/colors";
import { WEI } from "@ganache/utils";
import type { EthereumProvider } from "@ganache/ethereum";
import { toChecksumAddress } from "@ethereumjs/util";
import { CliSettings } from "../types";

function capitalizeFirstLetter(string: string) {
  return string[0].toUpperCase() + string.slice(1);
}
function color(str: string) {
  return chalk`{hex("${TruffleColors.porsche}") ${str}}`;
}

export default function (provider: EthereumProvider, cliSettings: CliSettings) {
  const liveOptions = provider.getOptions();
  const accounts = provider.getInitialAccounts();

  const addresses = Object.entries(accounts);
  const logs = [];
  logs.push("");
  logs.push("Available Accounts");
  logs.push("==================");
  if (addresses.length > 0) {
    addresses.forEach(([address, account], index) => {
      const balance = account.balance;
      const strBalance = balance / WEI;
      const about = balance % WEI === 0n ? "" : "~";
      let line = `(${index}) ${toChecksumAddress(
        address
      )} (${about}${strBalance} ETH)`;

      if (!account.unlocked) {
        line += " 🔒";
      }

      logs.push(line);
    });

    logs.push("");
    logs.push("Private Keys");
    logs.push("==================");

    addresses.forEach(([_, account], index) => {
      logs.push(`(${index}) ${account.secretKey}`);
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
  logs.push("RPC Listening on " + cliSettings.host + ":" + cliSettings.port);
  console.log(logs.join("\n"));
}
