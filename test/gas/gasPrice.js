const assert = require("assert");
const bootstrap = require("../helpers/contract/bootstrap");
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
        const ganacheProviderOptions = { vmErrorsOnRPCResponse: true };
        const context = await bootstrap(contractRef, ganacheProviderOptions);
        const { accounts, instance, web3 } = context;

        const assignedGasPrice = 2000000000;

        const { transactionHash } = await instance.methods.setValue("0x10").send({ from: accounts[0], gas: 3141592 });
        const { gasPrice } = await web3.eth.getTransaction(transactionHash);

        assert.deepStrictEqual(parseInt(gasPrice), assignedGasPrice);
      });
    });

    describe("zero gasPrice", async function() {
      this.timeout(10000);
      it("should be possible to set a zero gas price", async function() {
        const seed = randomInteger(SEED_RANGE);
        const ganacheProviderOptions = {
          seed,
          gasPrice: 0,
          vmErrorsOnRPCResponse: true,
          hardfork: "berlin"
        };
        const context = await bootstrap(contractRef, ganacheProviderOptions);

        const { accounts, instance, web3 } = context;

        const { transactionHash } = await instance.methods.setValue("0x10").send({ from: accounts[0], gas: 3141592 });
        const { gasPrice } = await web3.eth.getTransaction(transactionHash);
        assert.deepStrictEqual(parseInt(gasPrice), 0);
      });
    });
  });
});
