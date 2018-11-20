const assert = require("assert");
const { rpcSend } = require("./helpers/rpc");
const { preloadWeb3 } = require("./helpers/pretest_setup");

describe("Uncle support", function() {
  describe("retrieving uncles", function() {
    const services = preloadWeb3();

    it("by hash", async function() {
      const { web3 } = services;

      // Validate a good hash lookup
      const { hash, uncles } = await web3.eth.getBlock("latest");
      const method = "eth_getUncleCountByBlockHash";
      const params = [hash];
      const { result } = await rpcSend(method, params, web3);
      assert.notStrictEqual(result, "0x0");
      assert.strictEqual(result, uncles.length);

      // Validate a bad hash lookup
      try {
        const method = "eth_getUncleCountByBlockHash";
        const invalidHash = `0x${"f".repeat(64)}`;
        const params = [invalidHash];
        await rpcSend(method, params, web3);
      } catch (error) {
        const expectedErrorMessage = "Unknown block hash";
        assert.strictEqual(error.message, expectedErrorMessage);
      }
    });

    it("by block number", async function() {
      const { web3 } = services;
      const { number, uncles } = await web3.eth.getBlock("latest");
      const method = "eth_getUncleCountByBlockNumber";
      const params = [number];
      const { result } = await rpcSend(method, params, web3);
      assert.notStrictEqual(result, "0x0");
      assert.strictEqual(result, uncles.length);

      // Validate a bad block number lookup
      try {
        const method = "eth_getUncleCountByBlockNumber";
        const { number } = await web3.eth.getBlock("latest");
        const invalidBlockNumber = number + 1000;
        const params = [invalidBlockNumber];
        await rpcSend(method, params, web3);
      } catch (error) {
        const expectedErrorMessage = "Unknown block number";
        assert.strictEqual(error.message, expectedErrorMessage);
      }
    });
  });
});
