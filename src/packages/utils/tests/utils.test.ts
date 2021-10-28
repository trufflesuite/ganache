"use strict";
const oldWarn = console.warn;
let failedToLoad = false;
console.warn = e => {
  console.log(e);
  if (
    e ===
    "bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)"
  ) {
    failedToLoad = true;
  }
};

import { bufferToBigInt } from "../src/utils/buffer-to-bigint";
import assert from "assert";

const utils = require("..");

describe.only("@ganache/utils", () => {
  describe("bigint-buffer library", () => {
    before(() => {});
    it("loads binaries on all platforms", () => {
      const buf = Buffer.from([255, 0]);
      const bigint = bufferToBigInt(buf);
      assert.strictEqual(failedToLoad, false);
      assert.strictEqual(bigint, 65280n);
    });
    after(() => {
      console.warn = oldWarn;
    });
  });
});
