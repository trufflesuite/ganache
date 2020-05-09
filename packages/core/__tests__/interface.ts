import Ganache from "../src";
import * as assert from "assert";

describe("interface", () => {
  it("has an interface", () => {
    assert.ok(Ganache.server);
    assert.ok(Ganache.provider);
    assert.strictEqual("Server" in Ganache, false);
    assert.strictEqual("Provider" in Ganache, false);
  });
});
