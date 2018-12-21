const assert = require("assert");
const { setUp } = require("../helpers/pretestSetup");
const { hex } = require("../../lib/utils/to");

describe("options:gasPrice", () => {
  const mainContract = "Example";
  const contractFilenames = [];
  const contractPath = "../contracts/examples/";

  describe("default gasPrice", async() => {
    const options = {};
    const services = setUp(mainContract, contractFilenames, options, contractPath);

    it("should respect the default gasPrice", async() => {
      const { accounts, instance, provider, web3 } = services;

      const assignedGasPrice = provider.engine.manager.state.gasPriceVal;

      const { transactionHash } = await instance.methods.setValue("0x10").send({ from: accounts[0], gas: 3141592 });
      const { gasPrice } = await web3.eth.getTransaction(transactionHash);

      assert.deepStrictEqual(hex(gasPrice), hex(assignedGasPrice));
    });
  });

  describe("zero gasPrice", () => {
    const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
    const options = {
      mnemonic,
      gasPrice: 0
    };

    const services = setUp(mainContract, contractFilenames, options, contractPath);

    it("should be possible to set a zero gas price", async() => {
      const { accounts, instance, provider, web3 } = services;

      const assignedGasPrice = provider.engine.manager.state.gasPriceVal;
      assert.deepStrictEqual(hex(assignedGasPrice), "0x0");

      const { transactionHash } = await instance.methods.setValue("0x10").send({ from: accounts[0], gas: 3141592 });
      const { gasPrice } = await web3.eth.getTransaction(transactionHash);
      assert.deepStrictEqual(hex(gasPrice), hex(assignedGasPrice));
    });
  });
});
