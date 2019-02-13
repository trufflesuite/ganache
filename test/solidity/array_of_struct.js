const assert = require("assert");
const bootstrap = require("../helpers/contract/bootstrap");

describe("Solidity Data Types", function() {
  describe("Array of Structures", function() {
    let context;

    before("Setting up web3 and contract", async function() {
      this.timeout(10000);

      const contractRef = {
        contractFiles: ["ArrayOfStructs"],
        contractSubdirectory: "solidity"
      };

      const ganacheProviderOptions = {};

      context = await bootstrap(contractRef, ganacheProviderOptions);
    });

    it("can add structs to an array", async function() {
      this.timeout(6000);

      const { accounts, instance } = context;
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
