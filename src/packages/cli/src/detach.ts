import { fork } from "child_process";
import createInstanceName from "./process-name";
import envPaths from "env-paths";
import psList, { ProcessDescriptor } from "@trufflesuite/ps-list";
import { Dirent, promises as fsPromises } from "fs";
// this awkward import is required to support node 12
const { readFile, mkdir, readdir, rmdir, writeFile, unlink } = fsPromises;
import path from "path";
import { CliSettings } from "@ganache/flavor";

export type DetachedInstance = {
  name: string;
  pid: number;
  startTime: number;
  host: string;
  port: number;
  flavor: "ethereum" | string;
  cmd: string;
  version: string;
};

const FILE_ENCODING = "utf8";
const START_ERROR =
  "An error occurred spawning a detached instance of Ganache:";
const dataPath = envPaths(`Ganache/instances`, { suffix: "" }).data;

function getInstanceFilePath(instanceName: string): string {
  return path.join(dataPath, `${instanceName}.json`);
}

/**
 * Notify that the detached instance has started and is ready to receive requests.
 */
export function notifyDetachedInstanceReady(cliSettings: CliSettings) {
  // in "detach" mode, the parent will wait until the port is
  // received before disconnecting from the child process.
  process.send(cliSettings);
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
    await unlink(instanceFilename);
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
    flavor?: "ethereum" | string;
  },
  version: string
): Promise<DetachedInstance> {
  const [bin, module, ...args] = argv;

  // append `--no-detach` argument to cancel out --detach and aliases (must be
  // the last argument). See test "is false, when proceeded with --no-detach" in
  // args.test.ts
  const childArgs = [...args, "--no-detach"];

  const child = fork(module, childArgs, {
    stdio: ["ignore", "ignore", "pipe", "ipc"],
    detached: true
  });

  // Any messages output to stderr by the child process (before the `ready`
  // event is emitted) will be streamed to stderr on the parent.
  child.stderr.pipe(process.stderr);

  // Wait for the child process to send its port, which indicates that the
  // Ganache server has started and is ready to receive RPC requests. It signals
  // by sending the port number to which it was bound back to us; this is needed
  // because Ganache may bind to a random port if the user specified port 0.
  // It sends both `port` and `host` as a CliSettings, since host could
  // theoretically have a variable default (in the case of plugins), so we can't
  // just grab a `hostOptionObj.default(state)` host and use it here, as it
  // could differ from the actual host.
  const { port, host } = await new Promise<CliSettings>((resolve, reject) => {
    child.once("message", resolve);

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
  const cmd =
    process.platform === "win32"
      ? path.basename(process.execPath)
      : [process.execPath, ...process.execArgv, module, ...childArgs].join(" ");
  const pid = child.pid;
  const startTime = Date.now();

  const instance: DetachedInstance = {
    startTime,
    pid,
    name: createInstanceName(),
    host,
    port,
    flavor,
    cmd,
    version
  };

  while (true) {
    const instanceFilename = getInstanceFilePath(instance.name);
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
          instance.name = createInstanceName();
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
  let dirEntries: Dirent[];
  let processes: ProcessDescriptor[];
  let someInstancesFailed = false;

  try {
    [dirEntries, processes] = await Promise.all([
      readdir(dataPath, { withFileTypes: true }),
      psList()
    ]);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
    // instances directory does not (yet) exist, so there cannot be any instances
    return [];
  }
  const instances: DetachedInstance[] = [];

  const loadingInstancesInfos = dirEntries.map(async dirEntry => {
    const filename = dirEntry.name;
    const { name: instanceName, ext } = path.parse(filename);

    let failureReason: string;

    if (ext !== ".json") {
      failureReason = `"${filename}" does not have a .json extension`;
    } else {
      let instance: DetachedInstance;
      try {
        // getDetachedInstanceByName() throws if the instance file is not found or
        // cannot be parsed
        instance = await getDetachedInstanceByName(instanceName);
      } catch (err: any) {
        failureReason = err.message;
      }
      if (instance) {
        const matchingProcess = processes.find(p => p.pid === instance.pid);
        if (!matchingProcess) {
          failureReason = `Process with PID ${instance.pid} could not be found`;
        } else if (matchingProcess.cmd !== instance.cmd) {
          failureReason = `Process with PID ${instance.pid} does not match ${instanceName}`;
        } else {
          instances.push(instance);
        }
      }
    }

    if (failureReason !== undefined) {
      someInstancesFailed = true;
      const fullPath = path.join(dataPath, filename);
      let resolution: string;
      if (dirEntry.isDirectory()) {
        const reason = `"${filename}" is a directory`;
        try {
          await rmdir(fullPath, { recursive: true });
          failureReason = reason;
        } catch {
          resolution = `"${filename}" could not be removed`;
        }
      } else {
        try {
          await unlink(fullPath);
        } catch {
          resolution = `"${filename}" could not be removed`;
        }
      }

      console.warn(
        `Failed to load instance data. ${failureReason}. ${
          resolution || `"${filename}" has been removed`
        }.`
      );
    }
  });

  await Promise.all(loadingInstancesInfos);

  if (someInstancesFailed) {
    console.warn(
      "If this keeps happening, please open an issue at https://github.com/trufflesuite/ganache/issues/new\n"
    );
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
): Promise<DetachedInstance> {
  const filepath = getInstanceFilePath(instanceName);
  const content = await readFile(filepath, FILE_ENCODING);
  return JSON.parse(content) as DetachedInstance;
}

// adapted from https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/formatDuration.md
// under CC-BY-4.0 License https://creativecommons.org/licenses/by/4.0/
export function formatUptime(ms: number) {
  if (ms > -1000 && ms < 1000) return "Just started";

  const isFuture = ms < 0;
  ms = Math.abs(ms);

  const time = {
    d: Math.floor(ms / 86400000),
    h: Math.floor(ms / 3600000) % 24,
    m: Math.floor(ms / 60000) % 60,
    s: Math.floor(ms / 1000) % 60
  };
  const duration = Object.entries(time)
    .filter(val => val[1] !== 0)
    .map(([key, val]) => `${val}${key}`)
    .join(" ");

  return isFuture ? `In ${duration}` : duration;
}
