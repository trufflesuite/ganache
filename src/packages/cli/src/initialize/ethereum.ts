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
  let log = "\n";
  const appendLog = line => (log += line + "\n");

  appendLog("Available Accounts");
  appendLog("==================");
  if (addresses.length > 0) {
    let index = 0;
    for (const [address, account] of addresses) {
      const balance = account.balance;
      const strBalance = balance / WEI;
      const about = balance % WEI === 0n ? "" : "~";
      let line = `(${index++}) ${toChecksumAddress(
        address
      )} (${about}${strBalance} ETH)`;

      if (!account.unlocked) {
        line += " 🔒";
      }

      appendLog(line);
    }

    appendLog("");
    appendLog("Private Keys");
    appendLog("==================");

    index = 0;
    for (const [address, account] of addresses) {
      appendLog(`(${index++}) ${account.secretKey}`);
    }

    if (liveOptions.wallet.accountKeysPath != null) {
      appendLog("");
      appendLog(
        `Accounts and keys saved to ${liveOptions.wallet.accountKeysPath}`
      );
    }
  } else {
    appendLog("(no accounts unlocked)");
  }

  if (liveOptions.wallet.accounts == null) {
    appendLog("");
    appendLog("HD Wallet");
    appendLog("==================");
    appendLog(`Mnemonic:      ${color(liveOptions.wallet.mnemonic)}`);
    appendLog(
      `Base HD Path:  ${color(
        liveOptions.wallet.hdPath.join("/") + "/{account_index}"
      )}`
    );
  }

  if (liveOptions.miner.defaultGasPrice) {
    appendLog("");
    appendLog("Default Gas Price");
    appendLog("==================");
    appendLog(color(liveOptions.miner.defaultGasPrice.toBigInt().toString()));
  }

  if (liveOptions.miner.blockGasLimit) {
    appendLog("");
    appendLog("BlockGas Limit");
    appendLog("==================");
    appendLog(color(liveOptions.miner.blockGasLimit.toBigInt().toString()));
  }

  if (liveOptions.miner.callGasLimit) {
    appendLog("");
    appendLog("Call Gas Limit");
    appendLog("==================");
    appendLog(color(liveOptions.miner.callGasLimit.toBigInt().toString()));
  }

  if (liveOptions.fork.network || liveOptions.fork.url) {
    appendLog("");
    appendLog("Forked Chain");
    appendLog("==================");
    let location: string;
    if (liveOptions.fork.network) {
      location = `Ethereum ${capitalizeFirstLetter(
        liveOptions.fork.network.replace("goerli", "görli")
      )}, via ${chalk`{hex("${TruffleColors.infura}") 丕Infura}`}`;
    } else {
      location = (liveOptions.fork.url as any).toString();
    }

    appendLog(`Location:        ${color(location)}`);
    appendLog(
      `Block:           ${color(liveOptions.fork.blockNumber.toString())}`
    );
    appendLog(
      `Network ID:      ${color(liveOptions.chain.networkId.toString())}`
    );
    appendLog(`Time:            ${color(liveOptions.chain.time.toString())}`);

    if (liveOptions.fork.requestsPerSecond !== 0) {
      appendLog(
        `Requests/Second: ${color(
          liveOptions.fork.requestsPerSecond.toString()
        )}`
      );
    }
  }

  appendLog("");
  appendLog("Chain");
  appendLog("==================");
  appendLog(`Hardfork: ${color(liveOptions.chain.hardfork)}`);
  appendLog(`Id:       ${color(liveOptions.chain.chainId.toString())}`);

  appendLog("");
  appendLog("RPC Listening on " + cliSettings.host + ":" + cliSettings.port);
  console.log(log);
}
