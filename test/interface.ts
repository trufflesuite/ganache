import Ganache from "../index"
import * as assert from "assert";

describe("interface", () => {
  it("has an interface", ()=>{
    assert.ok(Ganache.server);
    assert.ok(Ganache.provider);
    assert.ok(Ganache.Server);
    assert.ok(Ganache.Provider);
  })
});
