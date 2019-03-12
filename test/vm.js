const assert = require("assert");
const bootstrap = require("./helpers/contract/bootstrap");

describe("revert opcode", function() {
  let context;
  before("Setting up web3 and contract", async function() {
    this.timeout(10000);
    const logger = {
      log: function(message) {}
    };

    const contractRef = {
      contractFiles: ["Revert"],
      contractSubdirectory: "revert"
    };

    const ganacheProviderOptions = {
      logger,
      seed: "1337"
    };

    context = await bootstrap(contractRef, ganacheProviderOptions);
  });

  it("should return a transaction receipt with status 0 on REVERT", async function() {
    const { accounts, instance, web3 } = context;
    let receipt;

    try {
      await instance.methods.alwaysReverts(5).send({ from: accounts[0] });
    } catch (error) {
      assert.strictEqual(error.results[error.hashes[0]].error, "revert", "Expected error result not returned.");
      receipt = await web3.eth.getTransactionReceipt(error.hashes[0]);
    }

    assert.notStrictEqual(receipt, null, "Transaction receipt shouldn't be null");
    assert.strictEqual(receipt.status, false, "Reverted (failed) transactions should have a status of FALSE.");
  });
});
