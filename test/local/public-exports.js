const Ganache = require(process.env.TEST_BUILD
  ? "../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../index.js");
const assert = require("assert");

describe("BuildType", function() {
  it("Tests that we are using the right version", () => {
    assert(process.env.TEST_BUILD ? Ganache._webpacked === true : Ganache._webpacked === false);
  });
});
