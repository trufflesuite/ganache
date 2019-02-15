const assert = require("assert");
const to = require("../../lib/utils/to.js");
const initializeTestProvider = require("../helpers/web3/initializeTestProvider");
const randomInteger = require("../helpers/utils/generateRandomInteger");
const SEED_RANGE = 1000000;

describe("Gas", function() {
  describe("options:gasLimit", function() {
    let context;
    before("Setting up web3", async function() {
      this.timeout(10000);
      const seed = randomInteger(SEED_RANGE);
      const ganacheProviderOptions = { seed };
      context = await initializeTestProvider(ganacheProviderOptions);
    });

    it("should respect the assigned gasLimit", async function() {
      const { provider, web3 } = context;
      const assignedGasLimit = provider.engine.manager.state.blockchain.blockGasLimit;
      const { gasLimit } = await web3.eth.getBlock("latest");
      assert.deepStrictEqual(gasLimit, to.number(assignedGasLimit));
    });
  });
});
