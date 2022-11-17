// @ts-nocheck
process.env.VERSION_CHECK_CONFIG_NAME = "testConfig";

import { isCI } from "../src/ci";
import assert from "assert";

describe("isCI", () => {
  it("returns true if envVar is found", () => {
    delete process.env.IGNORE_ISCI;
    process.env.TRUFFLE_SHUFFLE_TEST = true;
    assert.strictEqual(isCI(), true);
    delete process.env.TRUFFLE_SHUFFLE_TEST;
  });
  it("returns false if IGNORE_ISCI is set", () => {
    process.env.IGNORE_ISCI = true;
    assert.strictEqual(isCI(), false);
    delete process.env.IGNORE_ISCI;
  });
});

process.env.IGNORE_ISCI = true;

delete process.env.IGNORE_ISCI;
