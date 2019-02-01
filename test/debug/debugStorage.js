const assert = require("assert");
const bootstrap = require("../helpers/bootstrap");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe.only("Debug Storage", function() {
  const mainContract = "DebugContractStorage";
  const contractFilenames = ["DebugContractStorage", "DebugContract"];
  const contractPath = "../contracts/debug/";
  let options = {};

  const services = bootstrap(mainContract, contractFilenames, options, contractPath);
  const gas = 3141592;

  let hashToTrace = null;
  const expectedValueBeforeTrace = "5";

  //   before("set up transaction that should be traced", async() => {
  // come back to thisss
  //   });

  it("should do things", async() => {
    /* SETUP */
    const { accounts, instance, web3 } = services;
    options = {
      from: accounts[0],
      gas
    };
    const provider = web3.currentProvider;

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
    // otherValue should be the total of the initial value plus 3 from calling set()
    assert.strictEqual(updatedOtherValue, "8");

    /* DEBUGGING */
    // here we do the rpc call to debug_traceTransaction and do the damn thinggggg!!
    let arrayOfStorageKeyValues = [];

    provider.send(
      {
        jsonrpc: "2.0",
        method: "debug_traceTransaction",
        params: [hashToTrace, []],
        id: new Date().getTime()
      },
      function(_, result) {
        for (let op of result.result.structLogs) {
          if (op.op === "SSTORE") {
            arrayOfStorageKeyValues.push(op.storage);
          }
        }
        // grab the last two storage operations
        arrayOfStorageKeyValues = arrayOfStorageKeyValues.slice(-2);
        console.log(arrayOfStorageKeyValues);

        // This fails because we aren't maintaining storage properly. It should pass.
        // Also note this makes a Constantinople test fail, if you change to true then it will pass - weird things.
        assert.strictEqual(Object.keys(arrayOfStorageKeyValues[0]).length === 0, false);
      }
    );
  });
});
