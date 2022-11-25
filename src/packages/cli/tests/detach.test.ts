import { ConnectorsByName } from "@ganache/flavors/typings";
import assert from "assert";
import { join } from "path";
import {
  DetachedInstance,
  formatUptime,
  startDetachedInstance,
  stopDetachedInstance
} from "../src/detach";
import request from "superagent";

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

    // these tests aren't the best (in that they have a wide scope), but they
    // are that way because starting and stopping an instance is very slow. In
    // order to avoid blowing out the run time, we only start and stop once.
    describe("startDetachedInstance()", () => {
      const jsonRpc = {
        jsonrpc: "2.0",
        id: "1"
      };

      const instanceInfo = {
        flavor: "ethereum" as keyof ConnectorsByName,
        server: {
          host: "127.0.0.1",
          port: 8544
        }
      };

      const args = [
        "--detach",
        "--port",
        `${instanceInfo.server.port}`,
        "--chain.chainId",
        "1234"
      ];
      let instance: DetachedInstance;
      let beforeStartTime: number;

      before(async function () {
        // set timeout here, because the long running piece is in the before() hook
        this.timeout(30000);

        beforeStartTime = Date.now();
        const startingInstance = startDetachedInstance(
          ["_", join(__dirname, "../", "src", "cli.ts"), ...args],
          instanceInfo,
          "DEV",
          { execArgv: ["--require", "ts-node/register"] }
        );
        await assert.doesNotReject(async () => {
          instance = await startingInstance;
        }, "Failed to start detached instance");
      });

      after(async () => {
        try {
          assert.strictEqual(
            await stopDetachedInstance(instance.name),
            true,
            "Failed to stop the detached instance"
          );

          // allow the instance to stop, before asserting that it's no longer
          // responding (without this, ganache may be in the process of
          // stopping, in which case it will receive the request, but will
          // reject)
          await new Promise<void>(resolve => setTimeout(resolve, 100));

          await assert.rejects(
            request.post(`http://127.0.0.1:8545`).send({
              ...jsonRpc,
              method: "eth_blockNumber"
            }),
            "Instance is still responsive, after calling stop"
          );
        } finally {
          // this is a safety net, to attempt to kill the instance, in the case
          // that stopDetachedInstance() fails
          if (instance) {
            try {
              process.kill(instance.pid);
            } catch {}
          }
        }
      });

      it("creates a `DetachedInstance` object", () => {
        const nameRegex = /^[a-z]+_[a-z]+_[a-z]+$/;

        assert(
          nameRegex.test(instance.name),
          `Unexpected instance name: ${instance.name}`
        );
        assert(
          instance.startTime >= beforeStartTime &&
            instance.startTime <= Date.now(),
          `Unexpected instance start time: ${instance.startTime}`
        );
        assert(
          instance.pid > 0 && instance.pid <= 0xffffffff,
          `Unexpected pid: ${instance.pid}`
        );

        assert.strictEqual(instance.flavor, "ethereum", "Unexpected flavor");
        assert.strictEqual(
          instance.host,
          instanceInfo.server.host,
          "Unexpected host"
        );
        assert.strictEqual(
          instance.port,
          instanceInfo.server.port,
          "Unexpected port"
        );
        assert.strictEqual(instance.version, "DEV", "Unexpected version");
      });

      it("returns the expected chainId", async () => {
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
  });
});
