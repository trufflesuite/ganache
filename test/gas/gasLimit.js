const assert = require("assert");
const to = require("../../lib/utils/to.js");
const preloadTestProvider = require("../helpers/web3/preloadTestProvider");

describe("options:gasLimit", function() {
  const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
  const options = { mnemonic };
  const context = preloadTestProvider(options);

  it("should respect the assigned gasLimit", async function() {
    const { provider, web3 } = context;
    const assignedGasLimit = provider.engine.manager.state.blockchain.blockGasLimit;
    const { gasLimit } = await web3.eth.getBlock("latest");
    assert.deepStrictEqual(gasLimit, to.number(assignedGasLimit));
  });
});
