const assert = require("assert");
const bootstrap = require("../helpers/contract/bootstrap");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Debug Storage", function() {
  let options = {};
  let context;

  const gas = 3141592;

  let hashToTrace = null;
  const expectedValueBeforeTrace = "5";

  before("set up web3 and contract", async() => {
    this.timeout(10000);
    const contractRef = {
      contractFiles: ["DebugContractStorage", "DebugContract"],
      contractSubdirectory: "debug"
    };
    context = await bootstrap(contractRef);
  });

  before("set up transaction that should be traced", async() => {
    const { accounts, instance } = context;
    options = {
      from: accounts[0],
      gas
    };

    // check initial value and initial other value to ensure we know what we are starting with
    let initialValue = await instance.methods.getValue().call(options);
    let initialOtherValue = await instance.methods.getOtherValue().call(options);
    assert.strictEqual(initialValue, expectedValueBeforeTrace);
    assert.strictEqual(initialOtherValue, expectedValueBeforeTrace);

    let tx = await instance.methods.set().send(options);
    hashToTrace = tx.transactionHash;

    // check value and other value to see if it updated
    let updatedValue = await instance.methods.getValue().call(options);
    let updatedOtherValue = await instance.methods.getOtherValue().call(options);
    assert.strictEqual(updatedValue, "2");
    // otherValue should be the total of the initial value (5) plus 3 from calling set()
    assert.strictEqual(updatedOtherValue, "8");
  });

  it("should successfully trace a transaction with multiple calls to an instantiated contract", async() => {
    const { web3 } = context;
    const provider = web3.currentProvider;

    let arrayOfStorageKeyValues = [];

    provider.send(
      {
        jsonrpc: "2.0",
        method: "debug_traceTransaction",
        params: [hashToTrace, []],
        id: new Date().getTime()
      },
      function(_, result) {
        for (var i = 0; i < result.result.structLogs.length; i++) {
          let op = result.result.structLogs[i];
          let nextOp = result.result.structLogs[i + 1];
          if (op.op === "SSTORE") {
            // we want the nextOp because the storage changes doesn't take affect until after the SSTORE opcode
            arrayOfStorageKeyValues.push(nextOp.storage);
          }
        }

        // ensure the call to setValue with 1 was successfully stored for value
        assert.strictEqual(
          arrayOfStorageKeyValues[0]["0000000000000000000000000000000000000000000000000000000000000000"],
          "0000000000000000000000000000000000000000000000000000000000000001"
        );

        // ensure the call to setValue with 1 was successfully stored for otherValue, making it 6
        assert.strictEqual(
          arrayOfStorageKeyValues[1]["0000000000000000000000000000000000000000000000000000000000000001"],
          "0000000000000000000000000000000000000000000000000000000000000006"
        );

        assert.strictEqual(
          arrayOfStorageKeyValues[1]["0000000000000000000000000000000000000000000000000000000000000001"],
          "0000000000000000000000000000000000000000000000000000000000000006"
        );

        // ensure the call to setValue with 2 was successfully stored for value
        assert.strictEqual(
          arrayOfStorageKeyValues[3]["0000000000000000000000000000000000000000000000000000000000000000"],
          "0000000000000000000000000000000000000000000000000000000000000002"
        );

        // ensure the call to setValue with 2 was successfully stored for otherValue, making it 8
        assert.strictEqual(
          arrayOfStorageKeyValues[4]["0000000000000000000000000000000000000000000000000000000000000001"],
          "0000000000000000000000000000000000000000000000000000000000000008"
        );
      }
    );
  });
});
