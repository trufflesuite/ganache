import Ganache from "../index"
import * as assert from "assert";

describe("provider", () => {
  it("returns things", async ()=>{
    const p = Ganache.provider();
    const version = await p.send("net_version");
    assert.ok(version);
  });
});
