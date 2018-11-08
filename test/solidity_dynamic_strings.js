const assert = require("assert");
const pretest = require("./helpers/pretest_setup");

describe("Solidity Strings", function() {
  describe("modifying public strings", function() {
    const contractName = "DynamicStringLength";
    const context = pretest.setup(contractName);

    it("replacing a long string with a short string", async function() {
      const gas = 500000;

      const text = "1234567890".repeat(13);
      await context.instance.methods.set(text).send({ from: context.accounts[0], gas });
      let response = await context.instance.methods.testString().call();
      assert.strictEqual(response, text);

      const text2 = "123";
      await context.instance.methods.set(text2).send({ from: context.accounts[0], gas });
      response = await context.instance.methods.testString().call();
      assert.strictEqual(response, text2);
    });
  });
});
