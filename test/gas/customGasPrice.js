const assert = require("assert");
const initializeTestProvider = require("../helpers/web3/initializeTestProvider");

describe("Gas", function() {
  describe("Custom Gas Price", function() {
    it("should return gas price of 15 when specified as a decimal", async function() {
      const ganacheProviderOptions = {
        gasPrice: 15
      };
      const { web3 } = await initializeTestProvider(ganacheProviderOptions);
      const result = await web3.eth.getGasPrice();
      assert.strictEqual(parseInt(result), 15);
    });

    it("should return gas price of 15 when specified as hex (string)", async function() {
      const ganacheProviderOptions = {
        gasPrice: "0xf"
      };
      const { web3 } = await initializeTestProvider(ganacheProviderOptions);
      const result = await web3.eth.getGasPrice();
      assert.strictEqual(parseInt(result), 15);
    });

    it("should return gas price of 15 when specified as decimal (string)", async function() {
      const ganacheProviderOptions = {
        gasPrice: "15"
      };
      const { web3 } = await initializeTestProvider(ganacheProviderOptions);
      const result = await web3.eth.getGasPrice();
      assert.strictEqual(parseInt(result), 15);
    });
  });
});
