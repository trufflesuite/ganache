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

    it("should remove arguments who are kebab-cased", () => {
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
  });
});
