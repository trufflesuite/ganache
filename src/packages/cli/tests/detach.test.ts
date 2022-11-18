import assert from "assert";
import { stripDetachArg, formatDuration } from "../src/detach";

describe("@ganache/cli", () => {
  describe("detach", () => {
    describe("formatDuration()", () => {
      const durations = [
        [0, "Just now"],
        [0.1, "Just now"],
        [1, "Just now"],
        [2, "Just now"],
        [1000, "1 second"],
        [1001, "1 second"],
        [2000, "2 seconds"],
        [60000, "1 minute"],
        [62000, "1 minute, 2 seconds"],
        [1000000, "16 minutes, 40 seconds"],
        [-1000, "1 second"],
        [171906000, "1 day, 23 hours, 45 minutes, 6 seconds"]
      ];
      durations.forEach(duration => {
        const [ms, formatted] = duration;
        it(`should format an input of ${ms} as "${formatted}"`, () => {
          const result = formatDuration(ms as number);
          assert.strictEqual(result, formatted);
        });
      });
    });

    describe("stripDetachArg()", () => {
      ["--detach", "-D", "--😈"].forEach(detachArg => {
        it(`should strip the ${detachArg} argument when it's the only argument`, () => {
          const args = [detachArg];
          const stripped = stripDetachArg(args);

          assert.deepStrictEqual(stripped, []);
        });

        it(`should strip the ${detachArg} argument when it's the first argument`, () => {
          const args = [detachArg, "--b"];
          const stripped = stripDetachArg(args);

          assert.deepStrictEqual(stripped, ["--b"]);
        });

        it(`should strip the ${detachArg} argument when it's the last argument`, () => {
          const args = [detachArg, "--b"];
          const stripped = stripDetachArg(args);

          assert.deepStrictEqual(stripped, ["--b"]);
        });

        it(`should strip the ${detachArg} argument when it's the middle argument`, () => {
          const args = ["--a", detachArg, "--b"];
          const stripped = stripDetachArg(args);

          assert.deepStrictEqual(stripped, ["--a", "--b"]);
        });

        it(`should strip the ${detachArg} argument when it has a provided value`, () => {
          const args = ["--a", `${detachArg}=true`, "--b"];
          const stripped = stripDetachArg(args);

          assert.deepStrictEqual(stripped, ["--a", "--b"]);
        });

        it(`should strip the ${detachArg} argument when it has a provided value as the following argument`, () => {
          const args = ["--a", detachArg, "true", "--b"];
          const stripped = stripDetachArg(args);

          assert.deepStrictEqual(stripped, ["--a", "--b"]);
        });
      });

      ["-detach", "--D", "-😈", "--detachy", "detach", "-E"].forEach(
        incorrectArgument => {
          it(`should not strip ${incorrectArgument}`, () => {
            const args = ["--a", incorrectArgument, "--b"];
            const stripped = stripDetachArg(args);

            assert.deepStrictEqual(stripped, args);
          });
        }
      );
    });
  });
});
