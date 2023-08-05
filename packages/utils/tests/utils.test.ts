import assert from "assert";
import sinon from "sinon";
import { min, max } from "../";

const BIGINT_ERROR =
  "bigint: Failed to load bindings, pure JS will be used (try npm run rebuild?)";

describe("@ganache/utils", () => {
  describe("bigint-buffer library", () => {
    let spy: any;
    before(() => {
      spy = sinon.spy(console, "warn");
    });

    it("loads without warnings", () => {
      // make sure we're actually loading this module and not using a cached version
      delete require.cache[require.resolve("@trufflesuite/bigint-buffer")];
      // if prebuilt binaries aren't properly installed, we'll get a warning from
      // this lib saying that the JS fallback is being used.
      require("@trufflesuite/bigint-buffer");
      // so we'll spy on console.warn to ensure that our bigint-buffer warning
      // is never called when loading this library
      assert.strictEqual(spy.withArgs(BIGINT_ERROR).callCount, 0);
    });

    after(() => {
      spy.restore();
    });
  });
  describe("min-max", () => {
    const ascending = [0, 1, 2, 3, 4];
    const descending = [4, 3, 2, 1, 0];
    const mixedTypes = [0n, 1, 2, 3n, 4n];

    it("returns the min", () => {
      assert.strictEqual(min(...ascending), ascending[0]);
      assert.strictEqual(min(...descending), descending[descending.length - 1]);
      assert.strictEqual(min(...mixedTypes), mixedTypes[0]);
    });
    it("returns the max", () => {
      assert.strictEqual(max(...ascending), ascending[ascending.length - 1]);
      assert.strictEqual(max(...descending), descending[0]);
      assert.strictEqual(max(...mixedTypes), mixedTypes[mixedTypes.length - 1]);
    });
  });
});
