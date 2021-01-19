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

const logAndForceExit = (messages: any[], exitCode = 0) => {
  // https://nodejs.org/api/process.html#process_process_exit_code
  // writes to process.stdout in Node.js are sometimes asynchronous and may occur over
  // multiple ticks of the Node.js event loop. Calling process.exit(), however, forces
  // the process to exit before those additional writes to stdout can be performed.
  // se we set stdout to block in order to successfully log before exiting
  if ((process.stdout as any)._handle) {
    (process.stdout as any)._handle.setBlocking(true);
  }
  try {
    messages.forEach(console.log);
  } catch (e) {
    console.log(e);
  }

  // force the process to exit
  process.exit(exitCode);
};

const { version: ganacheVersion } = $INLINE_JSON("../../core/package.json");
const { version } = $INLINE_JSON("../package.json");
const detailedVersion =
  "Ganache CLI v" + version + " (ganache-core: " + ganacheVersion + ")";

const isDocker =
  "DOCKER" in process.env && process.env.DOCKER.toLowerCase() === "true";

const argv = args(detailedVersion, isDocker);

const flavor = argv.flavor;

const cliSettings = argv.server;

const server = Ganache.server(argv);

console.log(detailedVersion);

let started = false;
process.on("uncaughtException", function (e) {
  if (started) {
    logAndForceExit([e], 1);
  } else {
    logAndForceExit([e.stack], 1);
  }
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
  try {
    // graceful shutdown
    if (server.status === 1) {
      await server.close();
    }
    process.exitCode = 0;
  } catch (err) {
    logAndForceExit(
      [
        "\nReceived an error while attempting to close the server: ",
        err.stack || err
      ],
      1
    );
  }
};

process.on("SIGINT", closeHandler);
process.on("SIGTERM", closeHandler);
process.on("SIGHUP", closeHandler);

async function startGanache(err: Error) {
  if (err) {
    console.log(err);
    process.exitCode = 1;
    return;
  }
  started = true;

  switch (flavor) {
    case EthereumFlavorName:
    default: {
      initializeEthereum(server.provider, cliSettings);
      break;
    }
  }
}

server.listen(cliSettings.port, cliSettings.host, startGanache);
