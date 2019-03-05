const assert = require("assert");
const bootstrap = require("../helpers/contract/bootstrap");

describe.only("Transaction Data", () => {
  let context;

  before("Setting up web3 and contract", async function() {
    this.timeout(10000);
    const contractRef = {
      contractFiles: ["TransactionData"],
      contractSubdirectory: "transaction-data"
    };
    context = await bootstrap(contractRef);
  });

  it("should revert with correctly formatted input for data", async() => {
    let { instance, accounts, web3 } = context;

    try {
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: instance._address,
        gas: 31000,
        data: "0x01",
        value: 1
      });
      assert.fail("Call did not fail execution like it was supposed to");
    } catch (err) {
      assert.strictEqual(err.message, "VM Exception while processing transaction: revert");
    }
  });

  it("should revert with incorrectly formatted input for data", async() => {
    let { instance, accounts, web3 } = context;

    try {
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: instance._address,
        gas: 31000,
        data: "0x1",
        value: 1
      });
      assert.fail("Call did not fail execution like it was supposed to");
    } catch (err) {
      assert.strictEqual(err.message, "VM Exception while processing transaction: revert");
    }
  });
});
