const assert = require("assert");
const to = require("../../lib/utils/to.js");
const initializeTestProvider = require("../helpers/web3/initializeTestProvider");

describe("options:gasLimit", function() {
  let context = {};
  before("Setting up web3", async function() {
    this.timeout(10000);
    const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
    const options = { mnemonic };
    Object.assign(context, await initializeTestProvider(options));
  });

  it("should respect the assigned gasLimit", async function() {
    const { provider, web3 } = context;
    const assignedGasLimit = provider.engine.manager.state.blockchain.blockGasLimit;
    const { gasLimit } = await web3.eth.getBlock("latest");
    assert.deepStrictEqual(gasLimit, to.number(assignedGasLimit));
  });
});
