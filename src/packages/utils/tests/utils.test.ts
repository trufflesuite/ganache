"use strict";
const oldWarn = console.warn;
import { bufferToBigInt } from "../src/utils/buffer-to-bigint";
import "assert";
import assert from "assert";

const utils = require("..");

describe("@ganache/utils", () => {
  describe("bigint-buffer library", () => {
    before(() => {
      console.warn = e => {
        if (
          e ===
          "bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)"
        ) {
          assert.fail(e);
        }
      };
    });
    it("loads binaries on all platforms", () => {
      const buf = Buffer.from([255, 0]);
      const bigint = bufferToBigInt(buf);
      console.warn("test warn");
      assert.strictEqual(bigint, 65280n);
    });
    after(() => {
      console.warn = oldWarn;
    });
  });
});
