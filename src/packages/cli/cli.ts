#!/usr/bin/env node

import Ganache from "./index";
import { $INLINE_JSON } from "ts-transformer-inline-file";
import { toChecksumAddress } from "ethereumjs-util";
import args from "./args";

const { version: ganacheVersion } = $INLINE_JSON("../core/package.json");
const { version } = $INLINE_JSON("./package.json");
const detailedVersion =
  "Ganache CLI v" + version + " (ganache-core: " + ganacheVersion + ")";

const isDocker =
  "DOCKER" in process.env && process.env.DOCKER.toLowerCase() === "true";

const argv = args(detailedVersion, isDocker).argv;

function parseAccounts(accounts: string[]) {
  function splitAccount(account: string) {
    const accountParts = account.split(",");
    return {
      secretKey: accountParts[0],
      balance: accountParts[1]
    };
  }

  if (typeof accounts === "string") return [splitAccount(accounts)];
  else if (!Array.isArray(accounts)) return;

  var ret = [];
  for (var i = 0; i < accounts.length; i++) {
    ret.push(splitAccount(accounts[i]));
  }
  return ret;
}

if (argv.d) {
  argv.s = "TestRPC is awesome!"; // Seed phrase; don't change to Ganache, maintain original determinism
}

if (typeof argv.unlock == "string") {
  argv.unlock = [argv.unlock];
}

let logger: {
  log: (message?: any, ...optionalParams: any[]) => void;
} = console;

// If quiet argument passed, no output
if (argv.q === true) {
  logger = {
    log: function () {}
  };
}

// If the mem argument is passed, only show memory output,
// not transaction history.
if (argv.mem === true) {
  logger = {
    log: function () {}
  };

  setInterval(function () {
    console.log(process.memoryUsage());
  }, 1000);
}

var options = {
  wallet: {
    accountKeysPath: argv.account_keys_path,
    mnemonic: argv.m,
    seed: argv.s,
    totalAccounts: argv.a,
    defaultBalance: argv.e,
    accounts: parseAccounts(argv.account),
    unlockedAccounts: argv.unlock,
    secure: argv.n,
    hdPath: argv.hdPath
  } as any, // any type this because we just pass whatever the user gives us
  logging: {
    debug: argv.debug,
    verbose: argv.v,
    logger: logger
  },
  miner: {
    blockTime: argv.b,
    gasPrice: argv.g,
    blockGasLimit: argv.l,
    callGasLimit: argv.callGasLimit
  },
  // forking: {
  //   fork: argv.f,
  //   forkCacheSize: argv.forkCacheSize
  // }, // TODO
  chain: {
    hardfork: argv.k,
    networkId: argv.i,
    vmErrorsOnRPCResponse: !argv.noVMErrorsOnRPCResponse,
    allowUnlimitedContractSize: argv.allowUnlimitedContractSize,
    time: argv.t,
    chainId: argv.chainId,
    keepAliveTimeout: argv.keepAliveTimeout
  } as any,
  database: {
    dbPath: argv.db
  }
};

const server = Ganache.server(options);

console.log(detailedVersion);

let started = false;
process.on("uncaughtException", function (e) {
  if (started) {
    console.log(e);
  } else {
    console.log(e.stack);
  }
  process.exit(1);
});

// See http://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js
if (process.platform === "win32") {
  require("readline")
    .createInterface({
      input: process.stdin,
      output: process.stdout
    })
    .on("SIGINT", function () {
      process.emit("SIGINT" as any); // TODO: don't abuse process's emit
    });
}

const closeHandler = async function () {
  // graceful shutdown
  try {
    await server.close();
    process.exit(0);
  } catch (err) {
    // https://nodejs.org/api/process.html#process_process_exit_code
    // writes to process.stdout in Node.js are sometimes asynchronous and may occur over
    // multiple ticks of the Node.js event loop. Calling process.exit(), however, forces
    // the process to exit before those additional writes to stdout can be performed.
    if ((process.stdout as any)._handle)
      (process.stdout as any).setBlocking(true);
    console.log(err.stack || err);
    process.exit();
  }
};

process.on("SIGINT", closeHandler);
process.on("SIGTERM", closeHandler);
process.on("SIGHUP", closeHandler);

async function startGanache(err) {
  if (err) {
    console.log(err);
    return;
  }
  started = true;
  const liveOptions = server.provider.getOptions();
  const accounts = server.provider.getInitialAccounts();

  console.log("");
  console.log("Available Accounts");
  console.log("==================");

  var addresses = Object.keys(accounts);
  var ethInWei = 1000000000000000000n;

  addresses.forEach(function (address, index) {
    var balance = accounts[address].balance;
    var strBalance = balance / ethInWei;
    var about = balance % ethInWei === 0n ? "" : "~";
    var line = `(${index}) ${toChecksumAddress(
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
    console.log("(" + index + ") " + accounts[address].secretKey);
  });

  if (options.wallet.accountKeysPath != null) {
    console.log("");
    console.log("Accounts and keys saved to " + options.wallet.accountKeysPath);
  }

  if (argv.a == null) {
    console.log("");
    console.log("HD Wallet");
    console.log("==================");
    console.log("Mnemonic:      " + liveOptions.wallet.mnemonic);
    console.log(
      "Base HD Path:  " + liveOptions.wallet.hdPath + "{account_index}"
    );
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
  //   console.log("Location:       " + state.blockchain.options.fork);
  //   console.log(
  //     "Block:          " + to.number(state.blockchain.forkBlockNumber)
  //   );
  //   console.log("Network ID:     " + state.net_version);
  //   console.log(
  //     "Time:           " + (state.blockchain.startTime || new Date()).toString()
  //   );
  //   let maxCacheSize;
  //   if (options.forkCacheSize === -1) {
  //     maxCacheSize = "∞";
  //   } else {
  //     maxCacheSize = options.forkCacheSize + " bytes";
  //   }
  //   console.log("Max Cache Size: " + maxCacheSize);
  // }

  console.log("");
  console.log("Chain Id");
  console.log("==================");
  console.log(liveOptions.chain.chainId);

  console.log("");
  console.log("Listening on " + argv.h + ":" + argv.p);
}

server.listen(argv.p, argv.h, startGanache);
