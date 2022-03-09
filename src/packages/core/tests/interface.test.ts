import Ganache from "..";
import * as assert from "assert";
import { KNOWN_CHAINIDS } from "@ganache/utils";

describe("interface", () => {
  it("has an interface", () => {
    assert.ok(Ganache.server);
    assert.ok(Ganache.provider);
    const info = Ganache.__experimental_info();
    assert.deepStrictEqual(info.fork.knownChainIds, Array.from(KNOWN_CHAINIDS));
    assert.deepStrictEqual(info.version, "DEV");
    assert.strictEqual(Object.keys(Ganache).length, 3);

    // in v3 these two properties were *removed* because it was confusing.
    // these tests are kinda unnecessary, but I just want to intent to be
    // explicit.
    assert.strictEqual("Server" in Ganache, false);
    assert.strictEqual("Provider" in Ganache, false);
  });
});
