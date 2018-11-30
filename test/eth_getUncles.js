const assert = require("assert");
const Web3 = require("web3");
const Ganache = require("../index");
const { rpcSend } = require("./helpers/rpc");
const { preloadWeb3 } = require("./helpers/pretest_setup");

describe("Uncle support", function() {
  describe("retrieving uncle count", function() {
    const services = preloadWeb3();

    it("by hash", async function() {
      const { web3 } = services;

      // Validate a good hash lookup
      const { hash, uncles } = await web3.eth.getBlock("latest");
      const method = "eth_getUncleCountByBlockHash";
      const params = [hash];
      const { result } = await rpcSend(method, params, web3);
      assert.strictEqual(result, uncles.length);

      // Validate a BAD hash lookup
      try {
        const method = "eth_getUncleCountByBlockHash";
        const invalidHash = `0x${"f".repeat(64)}`;
        const params = [invalidHash];
        await rpcSend(method, params, web3);
        assert.fail("Invalid block hash was processed!");
      } catch (error) {
        const expectedErrorMessage = "Unknown block hash";
        assert.strictEqual(error.message, expectedErrorMessage);
      }
    });

    it("by block number", async function() {
      const { web3 } = services;

      // Validate a good block number lookup
      const { number, uncles } = await web3.eth.getBlock("latest");
      const method = "eth_getUncleCountByBlockNumber";
      const params = [number];
      const { result } = await rpcSend(method, params, web3);
      assert.strictEqual(result, uncles.length);

      // Validate a TOO HIGH block number lookup
      try {
        const { number } = await web3.eth.getBlock("latest");
        const invalidBlockNumber = number + 1000;
        const method = "eth_getUncleCountByBlockNumber";
        const params = [invalidBlockNumber];
        await rpcSend(method, params, web3);
        assert.fail("Invalid block number was processed!");
      } catch (error) {
        const expectedErrorMessage = "Unknown block number";
        assert.strictEqual(error.message, expectedErrorMessage);
      }

      // Validate a NEGATIVE block number lookup
      try {
        const invalidBlockNumber = -1;
        const method = "eth_getUncleCountByBlockNumber";
        const params = [invalidBlockNumber];
        await rpcSend(method, params, web3);
        assert.fail("Invalid block number was processed!");
      } catch (error) {
        const expectedErrorMessage = "Unknown block number";
        assert.strictEqual(error.message, expectedErrorMessage);
      }
    });

    it("by block tag", async function() {
      const { web3 } = services;
      const { uncles } = await web3.eth.getBlock("latest");

      // Validate a good block tag lookup
      const tags = ["latest", "earliest", "pending"];
      tags.forEach(async(tag) => {
        const method = "eth_getUncleCountByBlockNumber";
        const params = [tag];
        const { result } = await rpcSend(method, params, web3);
        assert.strictEqual(result, uncles.length);
      });

      // Validate a BAD block tag lookup
      const invalidTags = ["latest_blah", "earliest_blah", "pending_blah", ""];
      invalidTags.forEach(async(tag) => {
        try {
          const method = "eth_getUncleCountByBlockNumber";
          const params = [tag];
          await rpcSend(method, params, web3);
          assert.fail("Invalid block tag was processed!");
        } catch (error) {
          const expectedErrorMessage = "Unknown block number";
          assert.strictEqual(error.message, expectedErrorMessage);
        }
      });
    });

    it("through forking mainnet", async function() {
      this.timeout(15000);
      // Set up forking from mainnet
      const forkedWeb3 = new Web3(
        Ganache.provider({
          fork: "https://mainnet.infura.io"
        })
      );

      // Block numbers on mainnet containing uncles
      const oneUncleBlockNumber = 6790228;
      const twoUncleBlockNumber = 6795996;

      /* VALIDATING A SINGLE UNCLE COUNT */
      // Directly validate a single uncle count from a know block number on Mainnet
      let testBlock = await forkedWeb3.eth.getBlock(oneUncleBlockNumber);
      assert.strictEqual(testBlock.uncles.length, 1);

      // Validate single uncle count using Ganache rpc method
      let method = "eth_getUncleCountByBlockNumber";
      let params = [oneUncleBlockNumber];
      let { result } = await rpcSend(method, params, forkedWeb3);
      assert.strictEqual(testBlock.uncles.length, result);

      method = "eth_getUncleCountByBlockHash";
      params = [testBlock.hash];
      ({ result } = await rpcSend(method, params, forkedWeb3));
      assert.strictEqual(testBlock.uncles.length, result);

      /* VALIDATING A DOUBLE UNCLE COUNT */
      // Directly validate a single uncle count from a know block number on Mainnet
      testBlock = await forkedWeb3.eth.getBlock(twoUncleBlockNumber);
      assert.strictEqual(testBlock.uncles.length, 2);

      // Validate double uncle count using Ganache rpc method
      method = "eth_getUncleCountByBlockNumber";
      params = [twoUncleBlockNumber];
      ({ result } = await rpcSend(method, params, forkedWeb3));
      assert.strictEqual(testBlock.uncles.length, result);

      method = "eth_getUncleCountByBlockHash";
      params = [testBlock.hash];
      ({ result } = await rpcSend(method, params, forkedWeb3));
      assert.strictEqual(testBlock.uncles.length, result);
    });
  });
});
