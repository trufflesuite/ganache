#!/usr/bin/env node

import type Readline from "readline";
import Ganache, { ServerStatus } from "@ganache/core";
import args from "./args";
import { EthereumFlavorName, FilecoinFlavorName } from "@ganache/flavors";
import initializeEthereum from "./initialize/ethereum";
import initializeFilecoin from "./initialize/filecoin";
import type { FilecoinProvider } from "@ganache/filecoin";
import type { EthereumProvider } from "@ganache/ethereum";
import {
  cleanupDetachedInstanceFile,
  notifyDetachedInstanceReady,
  stopDetachedInstance,
  startDetachedInstance
} from "./detach";
import { TruffleColors } from "@ganache/colors";
import chalk from "chalk";

// if process.send is defined, this is a child_process (we assume a detached
// instance), so we need to notify that we are ready.
const isDetachedInstance = process.send !== undefined;

if (isDetachedInstance) {
  // we want to attach this listener as early as possible, to avoid leaving a
  // dangling instance file
  process.on("exit", () => {
    cleanupDetachedInstanceFile(process.pid);
  });
}

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
    messages.forEach(message => console.log(message));
  } catch (e) {
    console.log(e);
  }

  // force the process to exit
  process.exit(exitCode);
};

const version = process.env.VERSION || "DEV";
const cliVersion = process.env.CLI_VERSION || "DEV";
const coreVersion = process.env.CORE_VERSION || "DEV";

const detailedVersion = `ganache v${version} (@ganache/cli: ${cliVersion}, @ganache/core: ${coreVersion})`;

const isDocker =
  "DOCKER" in process.env && process.env.DOCKER.toLowerCase() === "true";

const argv = args(detailedVersion, isDocker);

// todo: defs need to improve this
if (process.argv.indexOf("stop") !== -1) {
  const instanceName = process.argv[process.argv.length - 1];

  if (stopDetachedInstance(instanceName)) {
    console.log("Process stopped");
  } else {
    console.error("Process not found");
  }
} else if (argv.detach) {
  startDetachedInstance(process.argv).then(instance => {
    const highlightedName = chalk.hex(TruffleColors.porsche)(
      instance.friendlyName
    );
    // output only the friendly name to allow users to capture stdout and use to
    // programmatically stop the instance
    console.log(highlightedName);
  });
} else {
  const flavor = argv.flavor;
  const cliSettings = argv.server;

  console.log(detailedVersion);

  let server: ReturnType<typeof Ganache.server>;
  try {
    server = Ganache.server(argv);
  } catch (error: any) {
    console.error(error.message);
    process.exit(1);
  }

  let started = false;
  process.on("uncaughtException", function (e) {
    if (started) {
      logAndForceExit([e], 1);
    } else {
      logAndForceExit([e.stack], 1);
    }
  });

  let receivedShutdownSignal: boolean = false;
  const handleSignal = async (signal: NodeJS.Signals) => {
    console.log(`\nReceived shutdown signal: ${signal}`);
    closeHandler();
  };
  const closeHandler = async () => {
    try {
      // graceful shutdown
      switch (server.status) {
        case ServerStatus.opening:
          receivedShutdownSignal = true;
          console.log("Server is currently starting; waiting…");
          return;
        case ServerStatus.open:
          console.log("Shutting down…");
          await server.close();
          console.log("Server has been shut down");
          break;
      }
      // don't just call `process.exit()` here, as we don't want to hide shutdown
      // errors behind a forced shutdown. Note: `process.exitCode` doesn't do
      // anything other than act as a place to anchor this comment :-)
      process.exitCode = 0;
    } catch (err: any) {
      logAndForceExit(
        [
          "\nReceived an error while attempting to shut down the server: ",
          err.stack || err
        ],
        1
      );
    }
  };

  // See http://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js
  if (process.platform === "win32") {
    const rl = (require("readline") as typeof Readline)
      .createInterface({
        input: process.stdin,
        output: process.stdout
      })
      .on("SIGINT", () => {
        // we must "close" the RL interface otherwise the process will think we
        // are still listening
        // https://nodejs.org/api/readline.html#readline_event_sigint
        rl.close();
        handleSignal("SIGINT");
      });
  }

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);
  process.on("SIGHUP", handleSignal);

  async function startGanache(err: Error) {
    if (err) {
      console.error(err);
      process.exitCode = 1;
      return;
    } else if (receivedShutdownSignal) {
      closeHandler();
      return;
    }
    started = true;
    switch (flavor) {
      case FilecoinFlavorName: {
        await initializeFilecoin(
          server.provider as FilecoinProvider,
          cliSettings
        );
        break;
      }
      case EthereumFlavorName:
      default: {
        initializeEthereum(server.provider as EthereumProvider, cliSettings);
        break;
      }
    }

    if (isDetachedInstance) {
      notifyDetachedInstanceReady();
    }
  }
  console.log("Starting RPC server");
  server.listen(cliSettings.port, cliSettings.host, startGanache);
}
