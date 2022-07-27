// @ts-nocheck
process.env.VERSION_CHECK_CONFIG_NAME = "testConfig";

import { detectCI } from "../src/ci";
import assert from "assert";

describe("detectCI", () => {
  beforeEach(() => {});
  it("returns true if envVar is found", () => {
    process.env.CI = true;
    assert.equal(detectCI(), true);
    process.env.CI = "";
  });
});
