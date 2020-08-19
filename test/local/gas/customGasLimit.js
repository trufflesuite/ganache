const assert = require("assert");
const initializeTestProvider = require("../../helpers/web3/initializeTestProvider");

describe("Gas", function() {
  describe("Custom Gas Limit", function() {
    it("The block should show the correct custom Gas Limit", async function() {
      const ganacheProviderOptions = { gasLimit: 5000000 };
      const { web3 } = await initializeTestProvider(ganacheProviderOptions);
      const { gasLimit } = await web3.eth.getBlock(0);

      assert.deepStrictEqual(gasLimit, 5000000);
    });
  });
});
