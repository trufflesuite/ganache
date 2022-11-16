import { fork } from "child_process";
import createInstanceName from "./process-name";
import envPaths from "env-paths";
import psList, { ProcessDescriptor } from "@trufflesuite/ps-list";
import { readFile, rm, mkdir, readdir, writeFile } from "fs/promises";
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

type CodedError = Error & { code: string };

const READY_MESSAGE = "ready";
const START_ERROR = "An error ocurred spawning a detached instance of Ganache:";
const dataPath = envPaths(`Ganache/instances`).data;

async function getInstanceFilePath(instanceName: string): Promise<string> {
  return path.join(await dataPath, instanceName);
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
  const instanceFilename = await getInstanceFilePath(instanceName);
  try {
    await rm(instanceFilename);
    return true;
  } catch (err) {}
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
  const childArgs = args.filter(
    arg => arg !== "--detach" && arg !== "--😈" && arg !== "-D"
  );

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
    const instanceFilename = await getInstanceFilePath(instance.instanceName);
    try {
      await writeFile(instanceFilename, JSON.stringify(instance), {
        // wx means "Open file for writing, but fail if the path exists". see
        // https://nodejs.org/api/fs.html#file-system-flags
        flag: "wx"
      });
      break;
    } catch (err) {
      switch ((err as CodedError).code) {
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
    [files, processes] = await Promise.all([readdir(await dataPath), psList()]);
  } catch (err) {
    if ((err as CodedError).code !== "ENOENT") {
      throw err;
    }
    return [];
  }
  const instances: DetachedInstance[] = [];

  for (let i = 0; i < files.length; i++) {
    const instanceName = files[i];
    let shouldRemoveFile = false;

    try {
      // getDetachedInstanceByName() throws if the instance file is not found or
      // cannot be parsed
      const instance = await getDetachedInstanceByName(instanceName);

      const matchingProcess = processes.find(p => p.pid === instance.pid);
      if (!matchingProcess) {
        console.warn(
          `Process not found; ${instanceName} has been removed.  (PID: ${instance.pid}).`
        );
        shouldRemoveFile = true;
      } else if (matchingProcess.cmd !== instance.cmd) {
        // if the cmd does not match the instance, the process has been killed,
        // and another application has taken the pid
        console.warn(
          `Process information doesn't match; ${instanceName} has been removed. (PID: ${instance.pid}).`
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

    if (shouldRemoveFile) removeDetachedInstanceFile(instanceName);
  }

  return instances;
}
/**
 * Attempts to load data for the instance specified by instanceName. Throws if
 * the instance file is not found or cannot be parsed
 * @param  {string} instanceName
 */
async function getDetachedInstanceByName(
  instanceName: string
): Promise<DetachedInstance | undefined> {
  const filepath = await getInstanceFilePath(instanceName);
  const content = await readFile(filepath, { encoding: "utf8" });
  return JSON.parse(content) as DetachedInstance;
}
