const assert = require("assert");
const bootstrap = require("../helpers/contract/bootstrap");
const { hex } = require("../../lib/utils/to");
const randomInteger = require("../helpers/utils/generateRandomInteger");
const SEED_RANGE = 1000000;

describe("Gas", function() {
  describe("options:gasPrice", function() {
    const contractRef = {
      contractFiles: ["Example"],
      contractSubdirectory: "examples"
    };

    describe("default gasPrice", async function() {
      this.timeout(10000);
      it("should respect the default gasPrice", async function() {
        const ganacheProviderOptions = {};
        const context = await bootstrap(contractRef, ganacheProviderOptions);
        const { accounts, instance, provider, web3 } = context;

        const assignedGasPrice = provider.engine.manager.state.gasPriceVal;

        const { transactionHash } = await instance.methods.setValue("0x10").send({ from: accounts[0], gas: 3141592 });
        const { gasPrice } = await web3.eth.getTransaction(transactionHash);

        assert.deepStrictEqual(hex(gasPrice), hex(assignedGasPrice));
      });
    });

    describe("zero gasPrice", async function() {
      this.timeout(10000);
      it("should be possible to set a zero gas price", async function() {
        const seed = randomInteger(SEED_RANGE);
        const ganacheProviderOptions = {
          seed,
          gasPrice: 0
        };
        const context = await bootstrap(contractRef, ganacheProviderOptions);

        const { accounts, instance, provider, web3 } = context;

        const assignedGasPrice = provider.engine.manager.state.gasPriceVal;
        assert.deepStrictEqual(hex(assignedGasPrice), "0x0");

        const { transactionHash } = await instance.methods.setValue("0x10").send({ from: accounts[0], gas: 3141592 });
        const { gasPrice } = await web3.eth.getTransaction(transactionHash);
        assert.deepStrictEqual(hex(gasPrice), hex(assignedGasPrice));
      });
    });
  });
});
