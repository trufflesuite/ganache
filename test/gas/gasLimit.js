const assert = require("assert");
const to = require("../../lib/utils/to.js");
const preloadWeb3 = require("../helpers/web3/preloadWeb3");

describe("options:gasLimit", () => {
  const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
  const options = { mnemonic };
  const services = preloadWeb3(options);

  it("should respect the assigned gasLimit", async() => {
    const { provider, web3 } = services;
    const assignedGasLimit = provider.engine.manager.state.blockchain.blockGasLimit;
    const { gasLimit } = await web3.eth.getBlock("latest");
    assert.deepStrictEqual(gasLimit, to.number(assignedGasLimit));
  });
});
