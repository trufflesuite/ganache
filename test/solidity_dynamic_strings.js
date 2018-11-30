const assert = require("assert");
const { preloadContracts } = require("./helpers/pretest_setup");

describe("Contract Strings", function() {
  describe("modifying public strings within a contract", function() {
    // Main contract
    const mainContract = "DynamicStringLength"; // Name of the parent contract

    // List of all contracts to compile and deploy
    const subContractNames = ["DynamicStringLength", "DynamicStringLengthCheck"];

    const services = preloadContracts(mainContract, subContractNames);

    it("replacing a long string with a short string", async function() {
      /**
       * Enable access to:
       * accounts - randomly generated test accounts
       * instance - contract instance
       * provider - Ganache (Geth and Parity coming soon)
       * web3 - web3 interface
       */
      const { accounts, instance } = services;

      const gas = 1000000;

      /**
       * Contract transaction does the follow:
       * - Set `testString` to a VERY long public string
       * - Confirm `testString` with an internal validation function
       * - Confirm `testString` with an external contract validation function (contract-to-contract validation)
       */
      const text = "1234567890".repeat(13);
      await instance.methods.setAndConfirm(text).send({ from: accounts[0], gas });

      /**
       * Contract calls do the following:
       * 1. Validate the `testString` with getter function
       * 2. Validate the `testString` with internal validation function
       * 3. Validate the internal contract validation function
       */
      let response = await instance.methods.testString().call();
      assert.strictEqual(response, text);

      let status = await instance.methods.confirmStringInternally(text).call();
      assert.strictEqual(status, true);

      status = await instance.methods.confirmStringInternally(response).call();
      assert.strictEqual(status, true);

      /**
       * Contract transaction does the following:
       * - Set `testString` to a short public string
       * - Confirm `testString` with an internal validation function
       * - Confirm `testString` with an external contract validation function (contract-to-contract validation)
       */
      const text2 = "123";
      await instance.methods.setAndConfirm(text2).send({ from: accounts[0], gas });

      /**
       * Contract calls do the following:
       * 1. Validate the `testString` with getter function
       * 2. Validate the `testString` with internal validation function
       * 3. Validate the internal contract validation function
       */
      response = await instance.methods.testString().call();
      assert.strictEqual(response, text2);

      status = await instance.methods.confirmStringInternally(text2).call();
      assert.strictEqual(status, true);

      status = await instance.methods.confirmStringInternally(response).call();
      assert.strictEqual(status, true);
    });
  });
});
