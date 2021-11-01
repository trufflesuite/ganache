import assert from "assert";
import sinon from "sinon";
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
});
