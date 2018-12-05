const assert = require("assert");
const Web3 = require("web3");
var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const { send } = require("./helpers/rpc");

describe("Uncle support", function() {
  describe("checking uncle id through a forked blockchain", function() {
    // Set up a mainnet fork
    const forkedWeb3 = new Web3(
      Ganache.provider({
        fork: "https://mainnet.infura.io/v3/f6194ba837b640bba3db3d29cc658b07"
      })
    );

    // Block numbers on mainnet containing uncle(s)
    const oneUncleBlockNumber = 6790228;
    const twoUncleBlockNumber = 6795996;

    const validSingleUncleId = {
      position0: "0x7df1b5ba9ec1ec40ce7c3a288d5a207250cb6281471dc5265cf12ecb1acf254e"
    };
    const validDoubleUncleIds = {
      position0: "0x7c453812ec789be2d536a2c3d4ecf37086573d6064f1c4179a1b06895e03a6df",
      position1: "0xa91b05c06b58bd7ce5015c52a51e7d49de2b892c617fc5da395e88f32bcaf152"
    };

    let forkedBlocks = {};

    before("Retrieve forked blocks", async function() {
      this.timeout(20000);

      const [oneUncleBlock, twoUncleBlock] = await Promise.all([
        forkedWeb3.eth.getBlock(oneUncleBlockNumber),
        forkedWeb3.eth.getBlock(twoUncleBlockNumber)
      ]);

      // Precheck blocks containing uncle(s)
      assert.strictEqual(oneUncleBlock.uncles[0], validSingleUncleId.position0);
      assert.strictEqual(twoUncleBlock.uncles[0], validDoubleUncleIds.position0);
      assert.strictEqual(twoUncleBlock.uncles[1], validDoubleUncleIds.position1);

      forkedBlocks = Object.assign(forkedBlocks, {
        oneUncleBlock,
        twoUncleBlock
      });
    });

    it("should validate a block with a ONE uncle id by block number reference", async function() {
      this.timeout(10000);
      const method = "eth_getUncleByBlockNumberAndIndex";

      // Validate single uncle id at position 0
      let params = [oneUncleBlockNumber, 0];
      let { result } = await send(method, params, forkedWeb3);
      assert.strictEqual(result, validSingleUncleId.position0);

      // Validate single uncle id at position 0 (HEXADECIMAL INDEX)
      params = [oneUncleBlockNumber, "0x0"];
      ({ result } = await send(method, params, forkedWeb3));
      assert.strictEqual(result, validSingleUncleId.position0);
    });

    it("should validate a block with a ONE uncle id by hash reference", async function() {
      this.timeout(10000);
      const { oneUncleBlock } = forkedBlocks;
      const method = "eth_getUncleByBlockHashAndIndex";

      let params = [oneUncleBlock.hash, 0];
      let { result } = await send(method, params, forkedWeb3);
      assert.strictEqual(result, validSingleUncleId.position0);

      // Validate single uncle id (HEXADECIMAL index) at position 0 using block hash reference
      params = [oneUncleBlock.hash, "0x0"];
      ({ result } = await send(method, params, forkedWeb3));
      assert.strictEqual(result, validSingleUncleId.position0);
    });

    it("should validate a block with a TWO uncle ids by block number reference", async function() {
      this.timeout(10000);
      const method = "eth_getUncleByBlockNumberAndIndex";

      // Validate uncle id at position 0
      let params = [twoUncleBlockNumber, 0];
      let { result } = await send(method, params, forkedWeb3);
      assert.strictEqual(result, validDoubleUncleIds.position0);

      // Validate uncle id at position 1 with HEX index
      params = [twoUncleBlockNumber, "0x0"];
      ({ result } = await send(method, params, forkedWeb3));
      assert.strictEqual(result, validDoubleUncleIds.position0);

      // Validate uncle id at position 1
      params = [twoUncleBlockNumber, 1];
      ({ result } = await send(method, params, forkedWeb3));
      assert.strictEqual(result, validDoubleUncleIds.position1);

      // Validate uncle id at position 1 with HEX index
      params = [twoUncleBlockNumber, "0x1"];
      ({ result } = await send(method, params, forkedWeb3));
      assert.strictEqual(result, validDoubleUncleIds.position1);
    });

    it("should validate a block with a TWO uncle ids by hash reference", async function() {
      this.timeout(10000);
      const { twoUncleBlock } = forkedBlocks;
      const method = "eth_getUncleByBlockHashAndIndex";

      let params = [twoUncleBlock.hash, 0];
      let { result } = await send(method, params, forkedWeb3);
      assert.strictEqual(result, validDoubleUncleIds.position0);

      params = [twoUncleBlock.hash, 1];
      ({ result } = await send(method, params, forkedWeb3));
      assert.strictEqual(result, validDoubleUncleIds.position1);
    });

    it("should fail to access an invalid index", async function() {
      this.timeout(10000);
      // Fail to access DECIMAL based index greater than position 1 by block hash
      try {
        const { oneUncleBlock } = forkedBlocks;
        const method = "eth_getUncleByBlockHashAndIndex";
        const params = [oneUncleBlock.hash, 1];
        await send(method, params, forkedWeb3);
        assert.fail("Should not be able to access an out of range index");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index is out of range");
      }

      // Fail to access DECIMAL based index greater than position 1 by block number
      try {
        const method = "eth_getUncleByBlockNumberAndIndex";
        const params = [oneUncleBlockNumber, 1];
        await send(method, params, forkedWeb3);
        assert.fail("Should not be able to access an out of range index");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index is out of range");
      }

      // Fail to access HEXADECIMAL based index greater than position 1 by block hash
      try {
        const { oneUncleBlock } = forkedBlocks;
        const method = "eth_getUncleByBlockHashAndIndex";
        const params = [oneUncleBlock.hash, "0x1"];
        await send(method, params, forkedWeb3);
        assert.fail("Should not be able to access an out of range index");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index is out of range");
      }

      // Fail to access HEXADECIMAL based index greater than position 1 by block number
      try {
        const method = "eth_getUncleByBlockNumberAndIndex";
        const params = [oneUncleBlockNumber, "0x1"];
        await send(method, params, forkedWeb3);
        assert.fail("Should not be able to access an out of range index");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index is out of range");
      }

      // Fail to access DECIMAL based index greater than position 1 by block hash
      try {
        const { oneUncleBlock } = forkedBlocks;
        const method = "eth_getUncleByBlockHashAndIndex";
        const params = [oneUncleBlock.hash, 2];
        await send(method, params, forkedWeb3);
        assert.fail("Should not be able to access an uncle index greater than 1");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index must be 0 or 1");
      }

      // Acttempt to acess DECIMAL based index greater than position 1 by block number
      try {
        const method = "eth_getUncleByBlockNumberAndIndex";
        const params = [oneUncleBlockNumber, 2];
        await send(method, params, forkedWeb3);
        assert.fail("Should not be able to access an uncle index greater than 1");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index must be 0 or 1");
      }

      // Fail to access HEXADECIMAL based index greater than position 1 by block hash
      try {
        const { oneUncleBlock } = forkedBlocks;
        const method = "eth_getUncleByBlockHashAndIndex";
        const params = [oneUncleBlock.hash, "0x2"];
        await send(method, params, forkedWeb3);
        assert.fail("Should not be able to access an uncle index greater than 1");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index must be 0 or 1");
      }

      // Fail to access HEXADECIMAL based index greater than position 1 by block number
      try {
        const method = "eth_getUncleByBlockNumberAndIndex";
        const params = [oneUncleBlockNumber, "0x2"];
        await send(method, params, forkedWeb3);
        assert.fail("Should not be able to access an uncle index greater than 1");
      } catch (error) {
        assert.strictEqual(error.message, "Uncle array index must be 0 or 1");
      }
    });
  });
});
