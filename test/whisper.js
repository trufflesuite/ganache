const assert = require("assert");
const initializeTestProvider = require("./helpers/web3/initializeTestProvider");

describe("Whisper", function() {
  it("should call get whisper version (shh_version)", async function() {
    const { web3 } = await initializeTestProvider();
    const result = await web3.shh.getVersion();
    assert.strictEqual(result, "2", "Whisper version should be 2");
  });
});
