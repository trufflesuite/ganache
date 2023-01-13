import { isCI } from "../src/ci";
import assert from "assert";

describe("isCI", () => {
  it("returns true if envVar is found", () => {
    assert.strictEqual(isCI({ TRUFFLE_SHUFFLE_TEST: "true" }), true);
  });
  it("returns false if IGNORE_ISCI is set", () => {
    assert.strictEqual(
      isCI({ TRUFFLE_SHUFFLE_TEST: "true", IGNORE_ISCI: "true" }),
      false
    );
  });
});
