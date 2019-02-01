const assert = require("assert");
const bootstrap = require("../helpers/bootstrap");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe.only("Debug", function() {
  const mainContract = "DebugContract";
  const contractFilenames = ["DebugContractStorage"];
  const contractPath = "../contracts/debug/";
  let options = {};

  const services = bootstrap(mainContract, contractFilenames, options, contractPath);
  const gas = 3141592;

  let hashToTrace = null;
  const expectedValueBeforeTrace = "1234";

  before("set up transaction that should be traced", async() => {
    const { accounts, instance } = services;
    options = { from: accounts[0], gas };
    const tx = await instance.methods.setValue(26).send(options);

    // check the value is what we expect it to be: 26
    const value = await instance.methods.value().call(options);
    assert.strictEqual(value, "26");

    // set hashToTrace to the tx we made, so we know preconditions are correctly set
    hashToTrace = tx.transactionHash;
  });

  before("change state of contract to ensure trace doesn't overwrite data", async() => {
    const { accounts, instance } = services;
    options = { from: accounts[0], gas };
    await instance.methods.setValue(expectedValueBeforeTrace).send(options);

    // check the value is what we expect it to be: 1234
    const value = await instance.methods.value().call(options);
    assert.strictEqual(value, expectedValueBeforeTrace);
  });

  it("should trace a successful transaction without changing state", function() {
    // We want to trace the transaction that sets the value to 26
    const { accounts, instance, web3 } = services;
    const provider = web3.currentProvider;

    return new Promise((resolve, reject) => {
      provider.send(
        {
          jsonrpc: "2.0",
          method: "debug_traceTransaction",
          params: [hashToTrace, []],
          id: new Date().getTime()
        },
        function(err, response) {
          if (err) {
            reject(err);
          }
          if (response.error) {
            reject(response.error);
          }

          const structLogs = response.result.structLogs;

          // To at least assert SOMETHING, let's assert the last opcode
          assert(structLogs.length > 0);

          for (let op of structLogs) {
            if (op.stack.length > 0) {
              // check formatting of stack - it was broken when updating to ethereumjs-vm v2.3.3
              assert.strictEqual(op.stack[0].length, 64);
              assert.notStrictEqual(op.stack[0].substr(0, 2), "0x");
              break;
            }
          }

          const lastop = structLogs[structLogs.length - 1];

          assert.strictEqual(lastop.op, "STOP");
          assert.strictEqual(lastop.gasCost, 1);
          // TODO: circle back to this, it used to be 145 - why did it change?
          assert.strictEqual(lastop.pc, 155);
          assert.strictEqual(
            lastop.storage["0000000000000000000000000000000000000000000000000000000000000000"],
            "000000000000000000000000000000000000000000000000000000000000001a"
          );
          assert.strictEqual(
            lastop.storage["0000000000000000000000000000000000000000000000000000000000000001"],
            "000000000000000000000000000000000000000000000000000000000000001f"
          );

          resolve();
        }
      );
    }).then(async() => {
      // Now let's make sure rerunning this transaction trace didn't change state
      const value = await instance.methods.value().call({ from: accounts[0], gas });
      assert.strictEqual(value, expectedValueBeforeTrace);
    });
  });

  it("should trace a transaction with multiple calls to the same contract", async function() {
    /* SETUP */
    const { accounts, instance, web3 } = services;

    const provider = web3.currentProvider;
    options = {
      from: accounts[0],
      gas
    };

    let initialOtherValue = await instance.methods.otherValue().call(options);
    // otherValue started at 5, we then set value to 26, and then to 1234 = 1265
    assert.strictEqual(initialOtherValue, "1265");

    let tx = await instance.methods.callSetValueTwice().send(options);

    let updatedValue = await instance.methods.otherValue().call(options);
    // 1265 from line 162 + 3 we've added from calling callSetValueTwice() = 1268
    assert.strictEqual(updatedValue, "1268");

    /* DEBUGGING */
    let arrayOfStorageKeyValues = [];

    provider.send(
      {
        jsonrpc: "2.0",
        method: "debug_traceTransaction",
        params: [tx.transactionHash, []],
        id: new Date().getTime()
      },
      function(err, result) {
        console.log(err);
        for (let op of result.result.structLogs) {
          if (op.op === "SSTORE") {
            arrayOfStorageKeyValues.push(op.storage);
            // let yourNumber = parseInt(op.storage, 16);
          }
        }

        // grab the last two storage operations
        arrayOfStorageKeyValues = arrayOfStorageKeyValues.slice(-2);

        // ensure the call to setValue with 1 was successfully stored for value
        assert.strictEqual(
          arrayOfStorageKeyValues[0]["0000000000000000000000000000000000000000000000000000000000000000"],
          "0000000000000000000000000000000000000000000000000000000000000001"
        );
        // ensure the call to setValue with 1 was successfully stored for otherValue
        assert.strictEqual(
          arrayOfStorageKeyValues[0]["0000000000000000000000000000000000000000000000000000000000000001"],
          "00000000000000000000000000000000000000000000000000000000000004f2"
        );

        // ensure the call to setValue with 2 was successfully stored for value
        assert.strictEqual(
          arrayOfStorageKeyValues[1]["0000000000000000000000000000000000000000000000000000000000000000"],
          "0000000000000000000000000000000000000000000000000000000000000002"
        );
        // ensure the call to setValue with 2 was successfully stored for otherValue
        assert.strictEqual(
          arrayOfStorageKeyValues[1]["0000000000000000000000000000000000000000000000000000000000000001"],
          "00000000000000000000000000000000000000000000000000000000000004f4"
        );
      }
    );
  });

  it("should do things", async() => {
    /* SETUP */
    const { accounts, instance } = services;
    options = {
      from: accounts[0],
      gas: 3141592
    };

    // check initial value and initial other value to ensure we know what we are starting with
    let initialValue = await instance.methods.value().call(options);
    let initialOtherValue = await instance.methods.otherValue().call(options);
    // should be 2 since the last call was made to setValue with 2
    assert.strictEqual(initialValue, "2");
    // should be 1268 since that is the accumulative total thus far
    assert.strictEqual(initialOtherValue, "1268");

    let tx = await instance.methods.set().send(options);
    hashToTrace = tx.transactionHash;

    // check value and other value to see if it updated
    let updatedValue = await instance.methods.value().call(options);
    let updatedOtherValue = await instance.methods.otherValue().call(options);

    console.log(updatedValue, updatedOtherValue);

    /* DEBUGGING */
    // here we do the rpc call to debug_traceTransaction and do the damn thinggggg!!
  });
});
