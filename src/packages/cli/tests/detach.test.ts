import assert from "assert";
import { stripDetachArg } from "../src/detach";

describe("@ganache/cli", () => {
  describe("detach", () => {
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
