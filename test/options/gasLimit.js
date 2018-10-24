const Web3 = require("web3");
const assert = require("assert");
const Ganache = require("../../index.js");
const to = require("../../lib/utils/to.js");

const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

describe("options:gasLimit", function() {
  let options = { mnemonic };
  let provider = null;
  let web3 = null;

  before("setup web3", async function() {
    provider = Ganache.provider(options);
    web3 = new Web3(provider);
  });

  it("should respect the assigned gasLimit", async function() {
    let assignedGasLimit = provider.engine.manager.state.blockchain.blockGasLimit;
    let block = await web3.eth.getBlock("latest");
    assert.deepStrictEqual(block.gasLimit, to.number(assignedGasLimit));
  });
});
