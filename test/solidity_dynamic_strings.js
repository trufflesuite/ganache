const assert = require("assert");
const pretest = require("./helpers/pretest_setup");

describe("Solidity Strings", function() {
  describe("modifying public strings", function() {
    // Main contract
    const mainContract = "DynamicStringLength"; // Name of the parent contract

    // List of all contracts to compile and deploy
    const subContractNames = ["DynamicStringLength", "DynamicStringLengthCheck"];

    const services = pretest.setup(mainContract, subContractNames);

    it("replacing a long string with a short string", async function() {
      /**
       * Enable access to:
       * accounts - randomly generated test accounts
       * instance - contract instance
       * provider - Ganache ( Geth and Parity coming soon )
       * web3 - web3 interface
       */
      const { accounts, instance } = services;

      const gas = 1000000;

      // Set and confirm (within the EVM) a long string setting to a public variable
      const text = "1234567890".repeat(13);
      await instance.methods.set(text).send({ from: accounts[0], gas });

      // Only confirm the long string
      let status = await instance.methods.confirmSetting(text).call();
      assert.strictEqual(status, true);

      // Retrieve and confirm the long string
      let response = await instance.methods.testString().call();
      assert.strictEqual(response, text);

      // Set and confirm (within the EVM) a long string setting to a public variable
      const text2 = "123";
      await instance.methods.set(text2).send({ from: accounts[0], gas });

      // Only confirm the short string
      status = await instance.methods.confirmSetting(text2).call();
      assert.strictEqual(status, true);

      // Retrieve and confirm the short string
      response = await instance.methods.testString().call();
      assert.strictEqual(response, text2);
    });
  });
});
