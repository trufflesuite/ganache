import assert from "assert";
import { createFlatChildArgs } from "../src/detach";

describe("detach", () => {
  describe("createFlatChildArgs()", () => {
    it("should flatten a simple object", () => {
      const input = {
        a: "value-a",
        b: "value-b"
      };

      const result = createFlatChildArgs(input);

      assert.deepStrictEqual(result, ["--a=value-a", "--b=value-b"]);
    });

    it("should flatten a namespaced object", () => {
      const input = {
        a: {
          aa: "value-aa"
        },
        b: {
          bb: "value-bb"
        }
      };

      const result = createFlatChildArgs(input);
      assert.deepStrictEqual(result, ["--a.aa=value-aa", "--b.bb=value-bb"]);
    });
  });
});
