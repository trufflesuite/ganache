const assert = require("assert");
const Web3 = require("web3");
const { provider } = require("../index");
const { rpcSend } = require("./helpers/rpc");

describe("Uncle support", function() {
  describe("checking uncle id through a forked blockchain", function() {
    // Set up forking from mainnet
    const forkedWeb3 = new Web3(
      provider({
        fork: "https://mainnet.infura.io"
      })
    );

    // Block numbers on mainnet containing uncles
    const oneUncleBlockNumber = 6790228;
    const twoUncleBlockNumber = 6795996;
    const validSingleUncleId = {
      position0: "0x7df1b5ba9ec1ec40ce7c3a288d5a207250cb6281471dc5265cf12ecb1acf254e"
    };
    const validDoubleUncleIds = {
      position0: "0x7c453812ec789be2d536a2c3d4ecf37086573d6064f1c4179a1b06895e03a6df",
      position1: "0xa91b05c06b58bd7ce5015c52a51e7d49de2b892c617fc5da395e88f32bcaf152"
    };

    it("should validate a block with a SINGLE uncle id by hash or block number reference", async function() {
      this.timeout(10000);
      // Directly validate a single uncle id from a know block number on Mainnet
      let testBlock = await forkedWeb3.eth.getBlock(oneUncleBlockNumber);
      assert.strictEqual(testBlock.uncles[0], validSingleUncleId.position0);

      // Validate single uncle id using Ganache rpc methods
      let method = "eth_getUncleByBlockNumberAndIndex";
      let params = [oneUncleBlockNumber, 0];
      let { result } = await rpcSend(method, params, forkedWeb3);
      assert.strictEqual(result, validSingleUncleId.position0);

      method = "eth_getUncleByBlockHashAndIndex";
      params = [testBlock.hash, 0];
      ({ result } = await rpcSend(method, params, forkedWeb3));
      assert.strictEqual(result, validSingleUncleId.position0);

      // Access index greater than position 1 by block hash
      try {
        method = "eth_getUncleByBlockHashAndIndex";
        params = [testBlock.hash, 2];
        ({ result } = await rpcSend(method, params, forkedWeb3));
        assert.fail("Should not be able to access an uncle index greater than 1");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index must be 0 or 1");
      }

      // Access index greater than position 1 by block number
      try {
        method = "eth_getUncleByBlockNumberAndIndex";
        params = [testBlock.hash, 2];
        ({ result } = await rpcSend(method, params, forkedWeb3));
        assert.fail("Should not be able to access an uncle index greater than 1");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index must be 0 or 1");
      }

      // Attempt to access an out of range index
      try {
        method = "eth_getUncleByBlockHashAndIndex";
        params = [testBlock.hash, 1];
        ({ result } = await rpcSend(method, params, forkedWeb3));
        assert.fail("Should not be able to access an out of range index");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index is out of range");
      }
    });

    it("should validate a block with a DOUBLE uncle id by hash or block number reference", async function() {
      this.timeout(10000);
      // Directly validate a double uncle count from a know block number on Mainnet
      const testBlock = await forkedWeb3.eth.getBlock(twoUncleBlockNumber);
      assert.strictEqual(testBlock.uncles.length, 2);

      // Validate single uncle id using Ganache rpc methods
      let method = "eth_getUncleByBlockNumberAndIndex";
      let params = [twoUncleBlockNumber, 0];
      let { result } = await rpcSend(method, params, forkedWeb3);
      assert.strictEqual(result, validDoubleUncleIds.position0);

      method = "eth_getUncleByBlockHashAndIndex";
      params = [testBlock.hash, 0];
      ({ result } = await rpcSend(method, params, forkedWeb3));
      assert.strictEqual(result, validDoubleUncleIds.position0);

      // Validate single uncle id using Ganache rpc methods
      method = "eth_getUncleByBlockNumberAndIndex";
      params = [twoUncleBlockNumber, 1];
      ({ result } = await rpcSend(method, params, forkedWeb3));
      assert.strictEqual(result, validDoubleUncleIds.position1);

      method = "eth_getUncleByBlockHashAndIndex";
      params = [testBlock.hash, 1];
      ({ result } = await rpcSend(method, params, forkedWeb3));
      assert.strictEqual(result, validDoubleUncleIds.position1);

      // Access index greater than position 1
      try {
        method = "eth_getUncleByBlockHashAndIndex";
        params = [testBlock.hash, 2];
        ({ result } = await rpcSend(method, params, forkedWeb3));
        assert.fail("Should not be able to access an uncle index greater than 1");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index must be 0 or 1");
      }
    });
  });
});
