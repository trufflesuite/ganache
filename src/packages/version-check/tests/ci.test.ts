// @ts-nocheck
process.env.VERSION_CHECK_CONFIG_NAME = "testConfig";

import { detectCI } from "../src/ci";
import assert from "assert";

describe("detectCI", () => {
  beforeEach(() => {});
  it("returns true if envVar is found", () => {
    process.env.TRUFFLE_SHUFFLE_TEST = true;
    assert.equal(detectCI(), true);
    delete process.env.TRUFFLE_SHUFFLE_TEST;
  });
});
