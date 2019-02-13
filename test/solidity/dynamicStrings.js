const assert = require("assert");
const bootstrap = require("../helpers/contract/bootstrap");

describe("Contract Strings", function() {
  describe("modifying public strings within a contract", function() {
    let context;

    before("Setting up web3 and contract", async function() {
      this.timeout(10000);
      const contractRef = {
        contractFiles: ["DynamicStringLength", "DynamicStringLengthCheck"],
        contractSubdirectory: "solidity"
      };

      const ganacheProviderOptions = {};

      context = await bootstrap(contractRef, ganacheProviderOptions);
    });

    it("replacing a long string with a short string", async function() {
      const { accounts, instance } = context;
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
