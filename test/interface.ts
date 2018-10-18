import Ganache from "../index"
import * as assert from "assert";

describe("interface", () => {
  it("has an interface", ()=>{
    assert(Ganache.server);
    assert(Ganache.provider);
    assert(Ganache.Server);
    assert(Ganache.Provider);
  })
});
