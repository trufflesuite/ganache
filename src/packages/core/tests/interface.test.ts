import Ganache from "..";
import * as assert from "assert";

describe("interface", () => {
  it("has an interface", () => {
    assert.ok(Ganache.server);
    assert.ok(Ganache.provider);
    assert.strictEqual(Object.keys(Ganache).length, 2);

    // in v3 these two properties were *removed* because it was confusing.
    // these tests are kinda unncessary, but I just want to intent to be
    // explicit.
    assert.strictEqual("Server" in Ganache, false);
    assert.strictEqual("Provider" in Ganache, false);
  });
});
