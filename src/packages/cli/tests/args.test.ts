import assert from "assert";
import args, { expandArgs } from "../src/args";

describe("args", () => {
  describe("expandArgs()", () => {
    it("should expand arguments with namespaces", () => {
      const input = {
        "namespace.name": "value",
        "namespace.name2": "value2",
        "namespace2.name": "namespace2"
      };

      const result = expandArgs(input);

      assert.deepStrictEqual(result, {
        namespace: {
          name: "value",
          name2: "value2"
        },
        namespace2: {
          name: "namespace2"
        }
      });
    });

    it("should remove arguments without namespaces", () => {
      const input = {
        "namespace.name": "value",
        name: "no namespace"
      };

      const result = expandArgs(input);

      assert.deepStrictEqual(result, {
        namespace: {
          name: "value"
        }
      });
    });

    it("should remove arguments which are kebab-cased", () => {
      const input = {
        "namespace.name": "value",
        "namespace.kebab-case": "value",
        "kebab-namespace.name": "value"
      };

      const result = expandArgs(input);

      assert.deepStrictEqual(result, {
        namespace: { name: "value" }
      });
    });
  });

  describe("parse args", () => {
    const versionString = "Version string";
    const isDocker = false;

    describe("help", () => {
      it("should accept a help parameter", () => {
        const rawArgs = ["--help"];
        const options = args(versionString, isDocker, rawArgs);

        assert.deepStrictEqual(options, { action: "none" });
      });
    });

    describe("flavor", () => {
      it("should default to ethereum", () => {
        const options = args(versionString, isDocker, []);

        assert.strictEqual(options.action, "start");
        // We check the value of `options.action` here in order to narrow the
        // type of options. The negative case fails in the assert above.
        if (options.action === "start") {
          assert.strictEqual(options.flavor, "ethereum");
        }
      });

      it("should accept a flavor of ethereum", () => {
        const options = args(versionString, isDocker, ["ethereum"]);

        assert.strictEqual(options.action, "start");
        // We check the value of `options.action` here in order to narrow the
        // type of options. The negative case fails in the assert above.
        if (options.action === "start") {
          assert.strictEqual(options.flavor, "ethereum");
        }
      });

      it("should accept a flavor of filecoin", () => {
        const options = args(versionString, isDocker, ["filecoin"]);

        assert.strictEqual(options.action, "start");
        // We check the value of `options.action` here in order to narrow the
        // type of options. The negative case fails in the assert above.
        if (options.action === "start") {
          assert.strictEqual(options.flavor, "filecoin");
        }
      });

      it("should reject a non-standard flavor", () => {
        assert.throws(() => args(versionString, isDocker, ["not-a-flavor"]), {
          name: "YError",
          message: "Unknown argument: not-a-flavor"
        });
      });
    });

    describe("host and port", () => {
      it("should default configuration to 127.0.0.1:8545", () => {
        const options = args(versionString, isDocker, []);

        assert.strictEqual(options.action, "start");
        // We check the value of `options.action` here in order to narrow the
        // type of options. The negative case fails in the assert above.
        if (options.action === "start") {
          assert.strictEqual(options.server.host, "127.0.0.1");
          assert.strictEqual(options.server.port, 8545);
        }
      });

      it("should default configuration to 0.0.0.0:8545 if running within docker", () => {
        const options = args(versionString, true, []);

        assert.strictEqual(options.action, "start");
        // We check the value of `options.action` here in order to narrow the
        // type of options. The negative case fails in the assert above.
        if (options.action === "start") {
          assert.strictEqual(options.server.host, "0.0.0.0");
          assert.strictEqual(options.server.port, 8545);
        }
      });

      it("should parse the provided host configuration", () => {
        const options = args(versionString, true, ["--host", "localhost"]);

        assert.strictEqual(options.action, "start");
        // We check the value of `options.action` here in order to narrow the
        // type of options. The negative case fails in the assert above
        if (options.action === "start") {
          assert.strictEqual(options.server.host, "localhost");
          assert.strictEqual(options.server.port, 8545);
        }
      });

      it("should parse the provided port configuration", () => {
        const options = args(versionString, isDocker, ["--port", "1234"]);

        assert.strictEqual(options.action, "start");
        // We check the value of `options.action` here in order to narrow the
        // type of options. The negative case fails in the assert above
        if (options.action === "start") {
          assert.strictEqual(options.server.host, "127.0.0.1");
          assert.strictEqual(options.server.port, 1234);
        }
      });

      it("should reject invalid host argument", () => {
        const invalidHost = "";
        const rawArgs = ["--host", invalidHost];

        assert.throws(
          () => args(versionString, isDocker, rawArgs),
          new Error("Cannot leave host blank; please provide a host")
        );
      });

      it("should reject invalid port argument", () => {
        const invalidPorts = ["0", "-1", "65536", "absolutely-not-a-port"];
        for (const port of invalidPorts) {
          const rawArgs = ["--port", port];

          assert.throws(
            () => args(versionString, isDocker, rawArgs),
            new Error(`Port should be >= 0 and < 65536. Received ${port}.`),
            `Expected to throw with supplied port of '${port}'`
          );
        }
      });
    });

    describe("detach", () => {
      const versionString = "Version string";
      const isDocker = false;

      const detachModeArgs = [
        "--detach",
        "--D",
        "--😈",
        "--detach=true",
        "--D=true",
        "--😈=true"
      ];
      const notDetachModeArgs = [
        "--no-detach",
        "--no-D",
        "--no-😈",
        "--detach=false",
        "--D=false",
        "--😈=false"
      ];

      it("defaults to false when no arg provided", () => {
        const rawArgs = [];
        const options = args(versionString, isDocker, rawArgs);

        assert.strictEqual(
          options.action,
          "start",
          `Expected "options.detach" to be false when no argument is provided`
        );
      });

      detachModeArgs.forEach(arg => {
        it(`is true with ${arg}`, () => {
          const rawArgs = [arg];
          const options = args(versionString, false, rawArgs);

          assert.strictEqual(
            options.action,
            "start-detached",
            `Expected "options.detach" to be true with arg ${arg}`
          );
        });
      });

      notDetachModeArgs.forEach(arg => {
        it(`is false with ${arg}`, () => {
          const rawArgs = [arg];
          const options = args(versionString, false, rawArgs);

          assert.strictEqual(
            options.action,
            "start",
            `Expected "options.detach" to be false with arg ${arg}`
          );
        });
      });

      it("is false, when proceeded with --no-detach", () => {
        // see startDetachedInstance() in detach.ts
        const rawArgs = ["--detach", "-D", "--😈", "--no-detach"];
        const options = args(versionString, false, rawArgs);

        assert.strictEqual(options.action, "start");
      });
    });

    describe("instances", () => {
      it("should fail when no sub-command is specified", () => {
        const rawArgs = ["instances"];
        assert.throws(() => args(versionString, false, rawArgs), {
          name: "Error",
          message:
            "No sub-command given. See `ganache instances --help` for more information."
        });
      });

      it("should fail when invalid sub-command is specified", () => {
        const rawArgs = ["instances", "invalid-command"];
        assert.throws(() => args(versionString, false, rawArgs), {
          name: "YError",
          message: "Unknown argument: invalid-command"
        });
      });

      describe("list", () => {
        it("should parse the `list` sub command", () => {
          const rawArgs = ["instances", "list"];
          const options = args(versionString, isDocker, rawArgs);
          assert.strictEqual(
            options.action,
            "list",
            "Expected action to be 'list' when 'list' sub-command is specified"
          );
        });

        it("should not accept options", () => {
          const invalidOptions = ["detach", "port", "host", "chain.blockTime"];

          for (let option of invalidOptions) {
            const rawArgs = ["instances", "list", `--${option}`];

            assert.throws(
              () => args(versionString, isDocker, rawArgs),
              {
                name: "YError",
                message: `Unknown argument: ${option}`
              },
              `Expected to throw with arguments of '${JSON.stringify(rawArgs)}'`
            );
          }
        });

        it("should not accept an additional command", () => {
          const rawArgs = ["instances", "list", `additional-command`];

          assert.throws(
            () => args(versionString, isDocker, rawArgs),
            {
              name: "YError",
              message: "Unknown argument: additional-command"
            },
            `Expected to throw with arguments of '${JSON.stringify(rawArgs)}'`
          );
        });
      });

      describe("stop", () => {
        it("should fail if no instance name is supplied", () => {
          const rawArgs = ["instances", "stop"];
          assert.throws(() => args(versionString, isDocker, rawArgs));
        });

        it("should parse the `stop` sub command", () => {
          const rawArgs = ["instances", "stop", "instance-name"];
          const options = args(versionString, isDocker, rawArgs);

          assert.strictEqual(
            options.action,
            "stop",
            "Expected action to be 'list' when 'list' sub-command is specified"
          );

          // We check the value of `options.action` here in order to narrow the
          // type of options. The negative case fails in the assert above
          if (options.action === "stop") {
            assert.strictEqual(
              options.name,
              "instance-name",
              "Instance name should have been the specified argument"
            );
          }
        });
      });
    });
  });
});
