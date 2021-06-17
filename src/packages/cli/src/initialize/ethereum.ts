import { Provider } from "@ganache/ethereum";
import { utils } from "@ganache/utils";
import { toChecksumAddress } from "ethereumjs-util";
import { CliSettings } from "../types";

const WEI = utils.WEI;

export default function (provider: Provider, cliSettings: CliSettings) {
  const liveOptions = provider.getOptions();
  const accounts = provider.getInitialAccounts();

  console.log("");
  console.log("Available Accounts");
  console.log("==================");

  const addresses = Object.keys(accounts);

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

    console.log(line);
  });

  console.log("");
  console.log("Private Keys");
  console.log("==================");

  addresses.forEach(function (address, index) {
    console.log(`(${index}) ${accounts[address].secretKey}`);
  });

  if (liveOptions.wallet.accountKeysPath != null) {
    console.log("");
    console.log(
      `Accounts and keys saved to ${liveOptions.wallet.accountKeysPath}`
    );
  }

  if (liveOptions.wallet.accounts == null) {
    console.log("");
    console.log("HD Wallet");
    console.log("==================");
    console.log(`Mnemonic:      ${liveOptions.wallet.mnemonic}`);
    console.log(`Base HD Path:  ${liveOptions.wallet.hdPath}{account_index}`);
  }

  if (liveOptions.miner.defaultGasPrice) {
    console.log("");
    console.log("Default Gas Price");
    console.log("==================");
    console.log(liveOptions.miner.defaultGasPrice.toBigInt());
  }

  if (liveOptions.miner.blockGasLimit) {
    console.log("");
    console.log("BlockGas Limit");
    console.log("==================");
    console.log(liveOptions.miner.blockGasLimit.toBigInt());
  }

  if (liveOptions.miner.callGasLimit) {
    console.log("");
    console.log("Call Gas Limit");
    console.log("==================");
    console.log(liveOptions.miner.callGasLimit.toBigInt());
  }

  if (liveOptions.fork.url) {
    console.log("");
    console.log("Forked Chain");
    console.log("==================");
    console.log(`Location:        ${liveOptions.fork.url.toString()}`);
    console.log(`Block:           ${liveOptions.fork.blockNumber}`);
    console.log(`Network ID:      ${liveOptions.chain.networkId}`);
    console.log(`Time:            ${new Date().toString()}`);
    if (liveOptions.fork.requestsPerSecond !== 0) {
      console.log(`Requests/Second: ${liveOptions.fork.requestsPerSecond}`);
    }
  }

  console.log("");
  console.log("Chain Id");
  console.log("==================");
  console.log(liveOptions.chain.chainId);

  console.log("");
  console.log("RPC Listening on " + cliSettings.host + ":" + cliSettings.port);
}
