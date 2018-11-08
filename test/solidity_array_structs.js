const pretest = require("./helpers/pretest_setup");
const assert = require("assert");

describe("Solidity Data Types", function() {
  describe("Array of Structures", function() {
    const contractName = "ArrayOfStructs";
    const services = pretest.setup(contractName);

    it("can add structs to an array", async function() {
      /**
       * Enable access to:
       * accounts - randomly generated test accounts
       * instance - contract instance
       * provider - Ganache, Geth or Parity
       * web3 - web3 interface
       */

      const { accounts, instance } = services;

      this.timeout(6000);
      const myGuid = "Payment1";
      const paymentIndex = 0;
      const value = 10;
      const gas = 5000000;
      const iterations = 100;

      // Add and validate a struct to the array
      const response = await instance.methods.payForSomething(myGuid).send({
        from: accounts[0],
        value,
        gas
      });

      const { blockNumber, guid, payIndex, senderAddress } = response.events.PaymentPlaced.returnValues;

      assert.strictEqual(guid, myGuid);
      assert.strictEqual(senderAddress, accounts[0]);
      assert.strictEqual(parseInt(blockNumber), 2);
      assert.strictEqual(parseInt(payIndex), 0);

      // Update the status of a struct in the array
      await instance.methods.changeSomething(paymentIndex).call();

      // Add and validate 100 more struct to the array
      for (let i = 0; i < iterations; i++) {
        const response = await instance.methods.payForSomething(myGuid).send({
          from: accounts[0],
          value,
          gas
        });

        const { blockNumber, guid, payIndex, senderAddress } = response.events.PaymentPlaced.returnValues;

        assert.strictEqual(guid, myGuid);
        assert.strictEqual(senderAddress, accounts[0]);
        assert.strictEqual(parseInt(blockNumber), i + 3);
        assert.strictEqual(parseInt(payIndex), i + 1);
      }
    });
  });
});
