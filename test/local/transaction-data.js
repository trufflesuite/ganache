const assert = require("assert");
const bootstrap = require("../helpers/contract/bootstrap");

describe("Transaction Data", () => {
  // There was a bug that caused a data value of 0x1 to get converted to an empty buffer.
  // technically `0x1` is invalid for the data field, but geth supports it, so now we
  // do too.
  // These tests invoke a contract that checks that msg.data has a value. If the length
  // of `msg.data` is `0` the transaction does not revert, otherwise it does.
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
    const { instance, accounts, web3 } = context;

    await assert.rejects(
      web3.eth.sendTransaction({
        from: accounts[0],
        to: instance._address,
        gas: 31000,
        data: "0x01",
        value: 1
      }),
      /VM Exception while processing transaction: revert/,
      "Call did not fail execution like it was supposed to"
    );
  });

  it("should revert with incorrectly formatted input for data", async() => {
    const { instance, accounts, web3 } = context;

    await assert.rejects(
      web3.eth.sendTransaction({
        from: accounts[0],
        to: instance._address,
        gas: 31000,
        data: "0x1",
        value: 1
      }),
      /VM Exception while processing transaction: revert/,
      "Call did not fail execution like it was supposed to"
    );
  });
});
