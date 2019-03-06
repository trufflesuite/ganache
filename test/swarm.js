const assert = require("assert");
const initializeTestProvider = require("./helpers/web3/initializeTestProvider");

describe("Swarm", function() {
  const context = initializeTestProvider();
  it.skip("should get swarm info (bzz_info)", async function() {
    const { web3 } = context;
    const result = await web3.bzz.getInfo();
    assert.isArray(result, "Stub returns empty array");
  });

  it.skip("should get swarm hive (bzz_hive)", async function() {
    const { web3 } = context;
    const result = await web3.bzz.getHive();
    assert.isArray(result, "Stub returns empty array");
  });
});
