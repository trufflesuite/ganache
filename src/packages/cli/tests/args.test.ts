import assert from "assert";
import args from "../src/args";

describe("args", () => {
  describe("detach", () => {
    const versionString = "Version string";
    const isDocker = false;

    const detachModeArgs = ["--detach", "--D", "--😈"];
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
        options.detach,
        false,
        `Expected "options.detach" to be false when no argument is provided`
      );
    });

    detachModeArgs.forEach(arg => {
      it(`is true with ${arg}`, () => {
        const rawArgs = [arg];
        const options = args(versionString, false, rawArgs);

        assert.strictEqual(
          options.detach,
          true,
          `Expected "options.detach" to be true with arg ${arg}`
        );
      });
    });

    notDetachModeArgs.forEach(arg => {
      it(`is false with ${arg}`, () => {
        const rawArgs = [arg];
        const options = args(versionString, false, rawArgs);

        assert.strictEqual(
          options.detach,
          false,
          `Expected "options.detach" to be false with arg ${arg}`
        );
      });
    });
  });
});
