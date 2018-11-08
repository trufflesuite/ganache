const assert = require("assert");
const pretest = require("./helpers/pretest_setup");

describe("Solidity Strings", function() {
  describe("modifying public strings", function() {
    const contractName = "DynamicStringLength";
    const services = pretest.setup(contractName);

    it("replacing a long string with a short string", async function() {
      /**
       * Enable access to:
       * accounts - randomly generated test accounts
       * instance - contract instance
       * provider - Ganache, Geth or Parity
       * web3 - web3 interface
       */
      const { accounts, instance } = services;

      const gas = 500000;

      const text = "1234567890".repeat(13);
      await instance.methods.set(text).send({ from: accounts[0], gas });
      let response = await instance.methods.testString().call();
      assert.strictEqual(response, text);

      const text2 = "123";
      await instance.methods.set(text2).send({ from: accounts[0], gas });
      response = await instance.methods.testString().call();
      assert.strictEqual(response, text2);
    });
  });
});
