#!/usr/bin/env node

import Ganache from "../index";
import { $INLINE_JSON } from "ts-transformer-inline-file";
import args from "./args";
import {
  DefaultFlavor,
  FlavorName,
  EthereumFlavorName
} from "@ganache/flavors";
import initializeEthereum from "./initialize/ethereum";

const { version: ganacheVersion } = $INLINE_JSON("../../core/package.json");
const { version } = $INLINE_JSON("../package.json");
const detailedVersion =
  "Ganache CLI v" + version + " (ganache-core: " + ganacheVersion + ")";

const isDocker =
  "DOCKER" in process.env && process.env.DOCKER.toLowerCase() === "true";

const argv = args(detailedVersion, isDocker).argv;

let flavor: FlavorName = DefaultFlavor;
if (argv._.length > 0) {
  flavor = argv._[0] as FlavorName;
}

const serverSettings = argv.server as {
  host: string;
  port: number;
};

const server = Ganache.server({
  flavor,
  ...argv
});

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

  switch (flavor) {
    case EthereumFlavorName:
    default: {
      initializeEthereum(server.provider, serverSettings);
      break;
    }
  }
}

server.listen(serverSettings.port, serverSettings.host, startGanache);
