// @ts-nocheck
process.env.VERSION_CHECK_CONFIG_NAME = "testConfig";

import { envVars, detectCI } from "../src/ci";
import assert from "assert";

describe("detectCI", () => {
  const originalValues = [];

  before(() => {
    let current = 0;
    while (current < envVars.length) {
      originalValues[current] = process.env[envVars[current]];
      process.env[envVars[current]] = null;
      current++;
    }
  });

  after(() => {
    let current = 0;
    while (current < envVars.length) {
      process.env[envVars[current]] = originalValues[current];
      current++;
    }
  });
  it("returns true if envVar is found", () => {
    let current = 0;
    while (current < envVars.length) {
      assert(detectCI(process.env[envVars[current]]), false);

      process.env[envVars[current]] = true;
      assert(detectCI(process.env[envVars[current]]), true);

      current++;
    }
  });
});
