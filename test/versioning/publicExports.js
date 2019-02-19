const assert = require("assert");
const Ganache = require(process.env.TEST_BUILD
  ? "../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../index.js");

describe("BuildType", function() {
  it("should be using the right Ganache version", function() {
    assert(process.env.TEST_BUILD ? Ganache._webpacked === true : Ganache._webpacked === false);
  });
});
