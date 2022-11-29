import assert from "assert";
import { basename, join } from "path";
import {
  DetachedInstance,
  formatUptime,
  getDetachedInstances,
  startDetachedInstance,
  stopDetachedInstance
} from "../src/detach";
import request from "superagent";
import { FlavorName } from "@ganache/flavors";
import envPaths from "env-paths";
import { promises as fsPromises } from "fs";
// this awkward import is required to support node 12
const { readdir, rmdir, mkdir, writeFile } = fsPromises;
import psList from "@trufflesuite/ps-list";

const dataPath = envPaths(`Ganache/instances`, { suffix: "" }).data;

async function removeInstancesDirectory() {
  try {
    await rmdir(dataPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new Error(
        `Couldn't remove the instances folder\n${dataPath}\n Check that no instances are running`
      );
    }
  }
}

async function createInstanceFiles(
  files: { name: string; contents: string }[]
) {
  try {
    await mkdir(dataPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
      throw new Error(`Couldn't create the instances folder\n${dataPath}`);
    }
  }

  const writingFiles = files.map(async file => {
    const filePath = join(dataPath, file.name);
    await writeFile(filePath, file.contents);
  });

  await Promise.all(writingFiles);
}

const jsonRpc = {
  jsonrpc: "2.0",
  id: "1"
};

const instanceInfo = {
  flavor: "ethereum" as FlavorName,
  server: {
    host: "127.0.0.1",
    port: 8544
  }
};

describe("@ganache/cli", () => {
  describe("detach", () => {
    describe("formatUptime()", () => {
      const durations: [number, string][] = [
        [0, "Just started"],
        [0.1, "Just started"],
        [1, "Just started"],
        [-1, "Just started"],
        [2, "Just started"],
        [1000, "1s"],
        [1001, "1s"],
        [-1000, "In 1s"],
        [-1001, "In 1s"],
        [2000, "2s"],
        [60000, "1m"],
        [62000, "1m 2s"],
        [1000000, "16m 40s"],
        [-171906000, "In 1d 23h 45m 6s"],
        [171906000, "1d 23h 45m 6s"]
      ];

      durations.forEach(duration => {
        const [ms, formatted] = duration;
        it(`should format an input of ${ms} as "${formatted}"`, () => {
          const result = formatUptime(ms);
          assert.strictEqual(result, formatted);
        });
      });
    });

    describe("stopDetachedInstance()", () => {
      // successfully stopping an instance is covered in startDetachedInstance() below
      it("should fail to stop an instance that doesn't exist", async () => {
        const result = await stopDetachedInstance("burnt_potato_quiche");
        assert.strictEqual(result, false);
      });
    });

    describe("getDetachedInstances()", () => {
      beforeEach(removeInstancesDirectory);

      it("should return an empty array, when the directory does not exist", async () => {
        const instances = await getDetachedInstances();

        assert.deepStrictEqual(instances, []);
      });

      it("should remove invalid instance files", async () => {
        const cmd =
          process.platform === "win32"
            ? basename(process.execPath)
            : [
                process.execPath,
                ...process.execArgv,
                ...process.argv.slice(1)
              ].join(" ");

        const instanceInfo = {
          name: "instance_name",
          pid: process.pid, // the current process because it _definitely_ exists
          startTime: Date.now(),
          host: "127.0.0.1",
          port: 8545,
          flavor: "ethereum",
          cmd, // the current process because it _definitely_ exists
          version: "DEV"
        };
        await createInstanceFiles([
          {
            name: "no_json_extension.txt",
            contents: JSON.stringify(instanceInfo)
          },
          {
            name: "probably_mismatched_pid.json",
            contents: JSON.stringify({ ...instanceInfo, pid: 1234 })
          },
          {
            name: "mismatched_cmd.json",
            contents: JSON.stringify({ ...instanceInfo, cmd: "not the cmd" })
          },
          {
            name: "not_really_json.json",
            contents: "this isn't really JSON"
          }
        ]);

        const instances = await getDetachedInstances();

        assert.deepStrictEqual(
          instances,
          [],
          "Expected there to be no instances found"
        );

        const instanceFiles = await readdir(dataPath);
        assert.strictEqual(
          instanceFiles.length,
          0,
          "Expected there to be no entries left in the data path"
        );
      });
    });

    describe("startDetachedInstance()", () => {
      it("rejects when the underlying ganache instance exits", async () => {
        const startingInstance = startDetachedInstance(
          [
            "_",
            join(__dirname, "../", "src", "cli.ts"),
            "not",
            "valid",
            "args"
          ],
          instanceInfo,
          "DEV",
          ["--require", "ts-node/register"]
        );

        await assert.rejects(
          startingInstance,
          new Error(
            "An error occurred spawning a detached instance of Ganache:\nThe detached instance exited with error code: 0"
          ),
          "Expected the instance to reject"
        );
      }).timeout(10000);
    });

    // these tests aren't the best (in that they have a wide scope), but they
    // are that way because starting and stopping an instance is very slow. In
    // order to avoid blowing out the run time, we only start and stop once.
    describe("with a detached instance running", () => {
      const args = [
        "--detach",
        "--port",
        `${instanceInfo.server.port}`,
        "--chain.chainId",
        "1234"
      ];
      let runningInstance: DetachedInstance;
      let beforeStartTime: number;

      before(async function () {
        // set timeout here, because the long running piece is in the before() hook
        this.timeout(30000);

        // remove the instances folder (but only if it's empty), to ensure that we create it properly
        await removeInstancesDirectory();

        beforeStartTime = Date.now();
        const startingInstance = startDetachedInstance(
          ["_", join(__dirname, "../", "src", "cli.ts"), ...args],
          instanceInfo,
          "DEV",
          ["--require", "ts-node/register"]
        );
        await assert.doesNotReject(async () => {
          runningInstance = await startingInstance;
        }, "Failed to start detached instance");
      });

      after(async () => {
        try {
          assert.strictEqual(
            await stopDetachedInstance(runningInstance.name),
            true,
            "call to stopDetachedInstance() returned false"
          );

          // allow time for the instance to stop, before asserting that it's no
          // longer responding (without this, ganache may be in the process of
          // stopping, in which case it will receive the request, but will
          // [likely] reject)
          await new Promise<void>(resolve => setTimeout(resolve, 100));

          await assert.rejects(
            request.post(`http://127.0.0.1:8545`).send({
              ...jsonRpc,
              method: "eth_blockNumber"
            }),
            "Instance is still responsive after calling stop"
          );
        } finally {
          // attempt to kill the instance, in the case that
          // stopDetachedInstance() fails
          if (runningInstance) {
            try {
              process.kill(runningInstance.pid);
            } catch {}
          }
        }
      });

      // this validates the properties on the response from
      // `startDetachedInstance` in `before()`
      describe("startDetachedInstance()", () => {
        it("has reasonable values for non-deterministic properties", () => {
          const nameRegex = /^[a-z]+_[a-z]+_[a-z]+$/;

          assert(
            nameRegex.test(runningInstance.name),
            `Unexpected instance name: ${runningInstance.name}`
          );
          assert(
            runningInstance.startTime >= beforeStartTime &&
              runningInstance.startTime <= Date.now(),
            `Unexpected instance start time: ${runningInstance.startTime}`
          );
          assert(
            runningInstance.pid > 0 && runningInstance.pid <= 0xffffffff,
            `Unexpected pid: ${runningInstance.pid}`
          );
        });

        it("has the values passed in as arguments to startDetachedInstance()", () => {
          assert.strictEqual(
            runningInstance.flavor,
            "ethereum",
            "Unexpected flavor"
          );
          assert.strictEqual(
            runningInstance.host,
            instanceInfo.server.host,
            "Unexpected host"
          );
          assert.strictEqual(
            runningInstance.port,
            instanceInfo.server.port,
            "Unexpected port"
          );
          assert.strictEqual(
            runningInstance.version,
            "DEV",
            "Unexpected version"
          );
        });

        it("has a `cmd` property that matches the running process", async () => {
          const process = (await psList()).find(
            process => process.pid === runningInstance.pid
          );

          assert(process !== undefined, "Process not found");
          assert.strictEqual(
            runningInstance.cmd,
            process && process.cmd,
            "the `cmd` property does not match the process"
          );
        });
      });

      describe("chainId", () => {
        it("returns the chainId provided to startDetachedInstance()", async () => {
          const body = {
            ...jsonRpc,
            method: "eth_chainId",
            params: []
          };
          const res = await request
            .post(
              `http://${instanceInfo.server.host}:${instanceInfo.server.port}`
            )
            .send(body);

          const chainId = JSON.parse(res.text).result;

          assert.strictEqual(
            chainId,
            "0x4d2",
            "Doesn't return the expected chainId"
          );
        });
      });

      describe("getDetachedInstances()", () => {
        it("getDetachedInstances() should return the running instance", async () => {
          const instances = await getDetachedInstances();

          assert.strictEqual(instances.length, 1);
          assert.deepStrictEqual(instances[0], runningInstance);
        });
      });
    });
  });
});
