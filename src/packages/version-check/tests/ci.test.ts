// @ts-nocheck
process.env.VERSION_CHECK_CONFIG_NAME = "testConfig";

import { isCI } from "../src/ci";
import assert from "assert";

describe("isCI", () => {
  it("returns true if envVar is found", () => {
    process.env.TRUFFLE_SHUFFLE_TEST = true;
    assert.equal(isCI(), true);
    delete process.env.TRUFFLE_SHUFFLE_TEST;
  });
});
