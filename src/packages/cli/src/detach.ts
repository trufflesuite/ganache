import { fork } from "child_process";
import createInstanceName from "./process-name";
import envPaths from "env-paths";
import psList, { ProcessDescriptor } from "@trufflesuite/ps-list";
import { Dirent, promises as fsPromises } from "fs";
// this awkward import is required to support node 12
const { readFile, mkdir, readdir, rmdir, writeFile, unlink } = fsPromises;
import path from "path";
import { FlavorName } from "@ganache/flavors";

export type DetachedInstance = {
  name: string;
  pid: number;
  startTime: number;
  host: string;
  port: number;
  flavor: FlavorName;
  cmd: string;
  version: string;
};

const MAX_SUGGESTIONS = 4;
const MAX_LEVENSHTEIN_DISTANCE = 10;
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
export function notifyDetachedInstanceReady(port: number) {
  // in "detach" mode, the parent will wait until the port is
  // received before disconnecting from the child process.
  process.send(port);
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

// A fuzzy matched detached instance(s). Either a strong match as instance,
// or a list of suggestions.
type InstanceOrSuggestions =
  | { instance: DetachedInstance }
  | { suggestions: string[] };

/**
 * Attempts to stop a detached instance with the specified instance name by
 * sending a SIGTERM signal. Returns a boolean indicating whether the process
 * was found. If the PID is identified, but the process is not found, any
 * corresponding instance file will be removed.
 *
 * Note: This does not guarantee that the instance actually stops.
 * @param  {string} instanceName
 * @returns {InstanceOrSuggestions} either the stopped instance, or suggestions for similar instance names
 */
export async function stopDetachedInstance(
  instanceName: string
): Promise<InstanceOrSuggestions> {
  let instance;

  try {
    instance = await getDetachedInstanceByName(instanceName);
  } catch {
    const similarInstances = await getSimilarInstanceNames(instanceName);

    if (similarInstances.match) {
      try {
        instance = await getDetachedInstanceByName(similarInstances.match);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          // The instance file was removed between the call to
          // `getSimilarInstanceNames` and `getDetachedInstancesByName`, but we
          // didn't get suggestions (although some may exist). We _could_
          // reiterate stopDetachedInstance but that seems messy. Let's just
          // output "Instance not found", and be done with it.
          return {
            suggestions: []
          };
        }
        throw err;
      }
    } else {
      return { suggestions: similarInstances.suggestions };
    }
  }

  if (instance) {
    // process.kill() throws if the process was not found (or was a group process in Windows)
    try {
      process.kill(instance.pid, "SIGTERM");
    } catch (err) {
      // process not found
      // todo: log message saying that the process could not be found
    } finally {
      await removeDetachedInstanceFile(instance.name);
      return { instance };
    }
  }
}

/*
Find instances with names similar to instanceName.

If there is a single instance with an exact prefix match, it is returned as the
match property in the result. Otherwise, up to `MAX_SUGGESTIONS` names that are
similar to instanceName are returned, prioritizing names that start with
instanceName and then ordered by increasing Levenshtein distance, with a maximum
distance of `MAX_LEVENSHTEIN_DISTANCE`.
*/
async function getSimilarInstanceNames(
  instanceName: string
): Promise<{ match?: string; suggestions?: string[] }> {
  let filenames: string[];
  try {
    filenames = (await fsPromises.readdir(dataPath, { withFileTypes: true }))
      .map(file => {
        const { name, ext } = path.parse(file.name);
        if (ext === ".json") return name;
      })
      .filter(name => name !== undefined);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      // instances directory does not exist, so there can be no suggestions
      return { suggestions: [] };
    }
  }

  const matches = [];
  for (const name of filenames) {
    if (name.startsWith(instanceName)) {
      matches.push(name);
    }
  }

  if (matches.length === 1) {
    return { match: matches[0] };
  }

  const similar = [];
  for (const name of filenames) {
    const distance = levenshteinDistance(instanceName, name);

    similar.push({
      name,
      distance
    });
  }

  const suggestions = similar
    .filter(
      s =>
        s.distance <= MAX_LEVENSHTEIN_DISTANCE &&
        !matches.some(m => m === s.name)
    )
    .sort((a, b) => a.distance - b.distance)
    .map(s => s.name);

  // matches should be at the start of the suggestions array
  suggestions.splice(0, 0, ...matches);

  if (similar.length > 0) {
    return {
      suggestions: suggestions.slice(0, MAX_SUGGESTIONS)
    };
  }
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
  const port = await new Promise<number>((resolve, reject) => {
    child.on("message", port => {
      resolve(port as number);
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
  const { host } = instanceInfo.server;
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

export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
