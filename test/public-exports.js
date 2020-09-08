var Ganache = require("../../ganache-core/src/packages/core/lib/index.js").default;
const assert = require("assert");

describe("BuildType", function() {
  it.skip("Tests that we are using the right version", () => {
    assert(process.env.TEST_BUILD ? Ganache._webpacked === true : Ganache._webpacked === false);
  });
});
