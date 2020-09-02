const fs = require("fs");
const path = require("path");
const assert = require("assert");
const Ganache = require(process.env.TEST_BUILD
  ? "../../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../../index.js");

describe("options:account_keys_path", function() {
  const fileName = path.join(__dirname, "/test-file.json");

  function cleanUp() {
    try {
      fs.unlinkSync(fileName);
    } catch (e) {
      // ignore error
    }
  }
  before("clean up", () => {
    cleanUp();
  });
  it("should create the file", async function() {
    Ganache.provider({ account_keys_path: fileName });
    assert.strictEqual(fs.existsSync(fileName), true, "The account_keys file doesn't exist.");
  });
  after("clean up", () => {
    cleanUp();
  });
});
