import { Provider } from "@ganache/ethereum";
import { toChecksumAddress } from "ethereumjs-util";
import { CliSettings } from "../types";

export default function (provider: Provider, cliSettings: CliSettings) {
  const liveOptions = provider.getOptions();
  const accounts = provider.getInitialAccounts();

  const addresses = Object.keys(accounts);
  console.log("");
  console.log("Available Accounts");
  console.log("==================");
  if (addresses.length > 0) {
    const ethInWei = 1000000000000000000n;

    addresses.forEach(function (address, index) {
      const balance = accounts[address].balance;
      const strBalance = balance / ethInWei;
      const about = balance % ethInWei === 0n ? "" : "~";
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
  } else {
    console.log("(no accounts unlocked)");
  }

  if (liveOptions.wallet.accounts == null) {
    console.log("");
    console.log("HD Wallet");
    console.log("==================");
    console.log(`Mnemonic:      ${liveOptions.wallet.mnemonic}`);
    console.log(`Base HD Path:  ${liveOptions.wallet.hdPath}{account_index}`);
  }

  if (liveOptions.miner.gasPrice) {
    console.log("");
    console.log("Gas Price");
    console.log("==================");
    console.log(liveOptions.miner.gasPrice.toBigInt());
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

  // if (options.fork) {
  //   console.log("");
  //   console.log("Forked Chain");
  //   console.log("==================");
  //   console.log(`Location:       ${state.blockchain.options.fork}`);
  //   console.log(
  //     `Block:          ${to.number(state.blockchain.forkBlockNumber)}`
  //   );
  //   console.log(`Network ID:     ${state.net_version}`);
  //   console.log(
  //     `Time:           ${(state.blockchain.startTime || new Date()).toString()}`
  //   );
  //   let maxCacheSize;
  //   if (options.forkCacheSize === -1) {
  //     maxCacheSize = "∞";
  //   } else {
  //     maxCacheSize = `${options.forkCacheSize} bytes`;
  //   }
  //   console.log(`Max Cache Size: ${maxCacheSize}`);
  // }

  console.log("");
  console.log("Chain Id");
  console.log("==================");
  console.log(liveOptions.chain.chainId);

  console.log("");
  console.log("RPC Listening on " + cliSettings.host + ":" + cliSettings.port);
}
