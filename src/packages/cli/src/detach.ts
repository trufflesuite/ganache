import { fork } from "child_process";
import createInstanceName from "./process-name";
import envPaths from "env-paths";
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readdirSync,
  readFileSync
} from "fs";
import path from "path";
import psList from "ps-list";
import { StartArgs } from "./types";
import { FlavorName } from "@ganache/flavors";
import { createFlatChildArgs } from "./args";

export type DetachedInstance = {
  instanceName: string;
  pid: number;
  startTime: number;
  host: string;
  port: number;
  flavor: FlavorName;
};

const dataPath = envPaths(`ganache`).data;
if (!existsSync(dataPath)) mkdirSync(dataPath);

const READY_MESSAGE = "ready";

const START_ERROR = "An error ocurred spawning a detached instance of Ganache:";

/**
 * Notify that the detached instance has started and is ready to receive requests.
 */
export function notifyDetachedInstanceReady() {
  // in "detach" mode, the parent will wait until the "ready" message is
  // received before disconnecting from the child process.
  process.send(READY_MESSAGE);
}

/**
 * Attempt to find and remove the instance file for a detached instance.
 * @param  {number} pid the pid of the detached instance
 * @returns boolean indicating whether the instance file was cleaned up successfully
 */
export function removeDetachedInstanceFile(pid: number): boolean {
  const instanceFilename = `${dataPath}/${pid}`;
  if (existsSync(instanceFilename)) {
    rmSync(instanceFilename);
    return true;
  }
  return false;
}

/**
 * Attempts to stop a detached instance with the specified instance name by
 * sending a SIGTERM signal. Returns a boolean indicating whether the process
 * was found. If the PID is identified, but the process is not found, any
 * corresponding instance file will be removed.
 *
 * Note: This does not guarantee that the instance actually stops.
 * @param  {string} instanceName
 * @returns boolean indicating whether the instance was found.
 */
export async function stopDetachedInstance(
  instanceName: string
): Promise<boolean> {
  const instance = await findDetachedInstanceByName(instanceName);
  if (instance !== undefined) {
    try {
      process.kill(instance.pid, "SIGTERM");
    } catch (err) {
      // process.kill throws if the process was not found (or was a group process in Windows)
      removeDetachedInstanceFile(instance.pid);
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Start an instance of Ganache in detached mode.
 * @param  {string[]} argv arguments to be passed to the new instance.
 * @returns {Promise<DetachedInstance>} resolves to the DetachedInstance once it
 * is started and ready to receive requests.
 */
export async function startDetachedInstance(
  module: string,
  args: StartArgs<FlavorName>
): Promise<DetachedInstance> {
  const flavor = args.flavor;
  const childArgs = createFlatChildArgs(args);
  const child = fork(module, childArgs, {
    stdio: ["ignore", "ignore", "pipe", "ipc"],
    detached: true
  });

  // Any messages output to stderr by the child process (before the `ready`
  // event is emitted) will be streamed to stderr on the parent.
  child.stderr.pipe(process.stderr);

  const instances = await getDetachedInstances();
  const instanceNames = instances.map(instance => instance.instanceName);

  let instanceName: string;
  do {
    instanceName = createInstanceName();
  } while (instanceNames.indexOf(instanceName) !== -1);

  await new Promise<void>((resolve, reject) => {
    child.on("message", message => {
      if (message === READY_MESSAGE) {
        resolve();
      }
    });

    child.on("error", err => {
      // This only happens if there's an error starting the child process, not
      // if Ganache throws within the child process.
      console.error(`${START_ERROR}\n${err.message}`);
      process.exitCode = 1;
      reject(err);
    });

    child.on("exit", (code: number) => {
      // This shouldn't happen, so ensure that we surface a non-zero exit code.
      process.exitCode = code === 0 ? 1 : code;
      reject(
        new Error(
          `${START_ERROR}\nThe detached instance exited with error code: ${code}`
        )
      );
    });
  });

  // destroy the ReadableStream exposed by the child process, to allow the
  // parent to exit gracefully.
  child.stderr.destroy();
  child.unref();
  child.disconnect();

  const instance: DetachedInstance = {
    startTime: Date.now(),
    pid: child.pid,
    instanceName,
    host: args.server.host,
    port: args.server.port,
    flavor
  };

  const instanceFilename = `${dataPath}/${instance.pid}`;

  writeFileSync(instanceFilename, JSON.stringify(instance));

  return instance;
}

/**
 * Fetch all instance of Ganache running in detached mode. Cleans up any
 * instance files for processes that are no longer running.
 * @returns Promise<DetachedInstance[]> resolves with an array of instances
 */
export async function getDetachedInstances(): Promise<DetachedInstance[]> {
  const files = readdirSync(dataPath);
  const instances: DetachedInstance[] = [];

  const pids = (await psList()).map(process => process.pid);

  for (let i = 0; i < files.length; i++) {
    const pid = files[i];

    if (pids.some(p => p === parseInt(pid))) {
      const filepath = path.join(dataPath, pid);
      const content = readFileSync(filepath).toString("utf8");
      const instance = JSON.parse(content) as DetachedInstance;
      instances.push(instance);
    } else {
      removeDetachedInstanceFile(parseInt(pid));
    }
  }

  return instances;
}

async function findDetachedInstanceByName(
  instanceName: string
): Promise<DetachedInstance | undefined> {
  const instances = await getDetachedInstances();

  for (let i = 0; i < instances.length; i++) {
    if (instances[i].instanceName === instanceName) {
      return instances[i];
    }
  }
}
