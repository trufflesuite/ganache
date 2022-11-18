import { fork } from "child_process";
import createInstanceName from "./process-name";
import envPaths from "env-paths";
import psList, { ProcessDescriptor } from "@trufflesuite/ps-list";
import { promises as fsPromises } from "fs";
// this awkward import is required to support node 12
const { readFile, rm, mkdir, readdir, writeFile } = fsPromises;
import path from "path";
import { FlavorName } from "@ganache/flavors";

export type DetachedInstance = {
  instanceName: string;
  pid: number;
  startTime: number;
  host: string;
  port: number;
  flavor: FlavorName;
  cmd: string;
  version: string;
};

const FILE_ENCODING = "utf8";
const READY_MESSAGE = "ready";
const START_ERROR =
  "An error occurred spawning a detached instance of Ganache:";
const dataPath = envPaths(`Ganache/instances`).data;

function getInstanceFilePath(instanceName: string): string {
  return path.join(dataPath, instanceName);
}

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
 * @param  {string} instanceName the name of the instance to be removed
 * @returns boolean indicating whether the instance file was cleaned up successfully
 */
export async function removeDetachedInstanceFile(
  instanceName: string
): Promise<boolean> {
  const instanceFilename = getInstanceFilePath(instanceName);
  try {
    await rm(instanceFilename);
    return true;
  } catch {}
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
  try {
    // getDetachedInstanceByName() throws if the instance file is not found or
    // cannot be parsed
    const instance = await getDetachedInstanceByName(instanceName);

    // process.kill() throws if the process was not found (or was a group
    // process in Windows)
    process.kill(instance.pid, "SIGTERM");
  } catch (err) {
    return false;
  } finally {
    await removeDetachedInstanceFile(instanceName);
  }
  return true;
}

/**
 * Start an instance of Ganache in detached mode.
 * @param  {string[]} argv arguments to be passed to the new instance.
 * @returns {Promise<DetachedInstance>} resolves to the DetachedInstance once it
 * is started and ready to receive requests.
 */
export async function startDetachedInstance(
  argv: string[],
  instanceInfo: {
    flavor?: FlavorName;
    server: { host: string; port: number };
  },
  version: string
): Promise<DetachedInstance> {
  const [bin, module, ...args] = argv;
  const childArgs = stripDetachArg(args);

  const child = fork(module, childArgs, {
    stdio: ["ignore", "ignore", "pipe", "ipc"],
    detached: true
  });

  // Any messages output to stderr by the child process (before the `ready`
  // event is emitted) will be streamed to stderr on the parent.
  child.stderr.pipe(process.stderr);

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

  const flavor = instanceInfo.flavor;
  const { host, port } = instanceInfo.server;
  const cmd =
    process.platform === "win32"
      ? path.basename(process.execPath)
      : [process.execPath, ...process.execArgv, module, ...childArgs].join(" ");

  const pid = child.pid;
  const startTime = Date.now();

  const instance: DetachedInstance = {
    startTime,
    pid,
    instanceName: createInstanceName(),
    host,
    port,
    flavor,
    cmd,
    version
  };

  while (true) {
    const instanceFilename = getInstanceFilePath(instance.instanceName);
    try {
      await writeFile(instanceFilename, JSON.stringify(instance), {
        // wx means "Open file for writing, but fail if the path exists". see
        // https://nodejs.org/api/fs.html#file-system-flags
        flag: "wx",
        encoding: FILE_ENCODING
      });
      break;
    } catch (err) {
      switch ((err as NodeJS.ErrnoException).code) {
        case "EEXIST":
          // an instance already exists with this name
          instance.instanceName = createInstanceName();
          break;
        case "ENOENT":
          // we don't check whether the folder exists before writing, as that's
          // a very uncommon case. Catching the exception and subsequently
          // creating the directory is faster in the majority of cases.
          await mkdir(dataPath, { recursive: true });
          break;
        default:
          throw err;
      }
    }
  }

  return instance;
}

/**
 * Fetch all instance of Ganache running in detached mode. Cleans up any
 * instance files for processes that are no longer running.
 * @returns {Promise<DetachedInstance[]>} resolves with an array of instances
 */
export async function getDetachedInstances(): Promise<DetachedInstance[]> {
  let files: string[];
  let processes: ProcessDescriptor[];
  try {
    [files, processes] = await Promise.all([readdir(dataPath), psList()]);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
    return [];
  }
  const instances: DetachedInstance[] = [];

  const loadingInstancesInfos = files.map(async instanceName => {
    let shouldRemoveFile = false;
    try {
      // getDetachedInstanceByName() throws if the instance file is not found or
      // cannot be parsed
      const instance = await getDetachedInstanceByName(instanceName);

      const matchingProcess = processes.find(p => p.pid === instance.pid);
      if (!matchingProcess) {
        console.warn(
          `Process with PID ${instance.pid} could not be found; removing ${instanceName} from recorded instances.`
        );
        shouldRemoveFile = true;
      } else if (matchingProcess.cmd !== instance.cmd) {
        // if the cmd does not match the instance, the process has been killed,
        // and another application has taken the pid
        console.warn(
          `Process with PID ${instance.pid} doesn't match ${instanceName}; removing${instanceName} from recorded instances.`
        );
        shouldRemoveFile = true;
      } else {
        instances.push(instance);
      }
    } catch (err) {
      console.warn(
        `Failed to load instance data; ${instanceName} has been removed.`
      );
      shouldRemoveFile = true;
    }

    if (shouldRemoveFile) await removeDetachedInstanceFile(instanceName);
  });

  await Promise.all(loadingInstancesInfos);

  return instances;
}

/**
 * Attempts to load data for the instance specified by instanceName. Throws if
 * the instance file is not found or cannot be parsed
 * @param  {string} instanceName
 */
async function getDetachedInstanceByName(
  instanceName: string
): Promise<DetachedInstance> {
  const filepath = getInstanceFilePath(instanceName);
  const content = await readFile(filepath, FILE_ENCODING);
  return JSON.parse(content) as DetachedInstance;
}

const detachArgRegex = /^-(?:D|-detach|-😈)$|=/;
export function stripDetachArg(args: string[]): string[] {
  const strippedArgs = [...args];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (detachArgRegex.test(arg)) {
      const followingArg = args[i + 1];
      const hasTrailingValue =
        followingArg !== undefined && followingArg[0] !== "-";

      strippedArgs.splice(i, hasTrailingValue ? 2 : 1);
      return strippedArgs;
    }
  }
  return args;
}

// adapted from https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/formatDuration.md
// under CC-BY-4.0 License https://creativecommons.org/licenses/by/4.0/
export function formatDuration(ms: number) {
  ms = Math.abs(ms);
  const time = {
    day: Math.floor(ms / 86400000),
    hour: Math.floor(ms / 3600000) % 24,
    minute: Math.floor(ms / 60000) % 60,
    second: Math.floor(ms / 1000) % 60
  };
  return (
    Object.entries(time)
      .filter(val => val[1] !== 0)
      .map(([key, val]) => `${val} ${key}${val !== 1 ? "s" : ""}`)
      .join(", ") || "Just now"
  );
}
