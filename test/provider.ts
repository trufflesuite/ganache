import Ganache from "../index"
import * as assert from "assert";

describe("provider", () => {
  it("returns things", async () => {
    const p = Ganache.provider({
      network_id: "1234"
    });
    const version = await p.send("net_version");
    assert.strictEqual(version, "1234");
  });
});
