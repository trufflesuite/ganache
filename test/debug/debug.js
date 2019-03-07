const assert = require("assert");
const bootstrap = require("../helpers/contract/bootstrap");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Debug", function() {
  let options = {};
  let context;
  const gas = 3141592;
  let hashToTrace = null;
  let multipleCallsHashToTrace = null;
  const expectedValueBeforeTrace = "1234";

  before("set up web3 and contract", async function() {
    this.timeout(10000);
    const contractRef = {
      contractFiles: ["DebugContract"],
      contractSubdirectory: "debug"
    };
    context = await bootstrap(contractRef);
  });

  describe("Trace a successful transaction", function() {
    before("set up transaction that should be traced", async() => {
      const { accounts, instance } = context;
      options = { from: accounts[0], gas };
      const tx = await instance.methods.setValue(26).send(options);

      // check the value is what we expect it to be: 26
      const value = await instance.methods.value().call(options);
      assert.strictEqual(value, "26");

      // set hashToTrace to the tx we made, so we know preconditions are correctly set
      hashToTrace = tx.transactionHash;
    });

    before("change state of contract to ensure trace doesn't overwrite data", async() => {
      const { accounts, instance } = context;
      options = { from: accounts[0], gas };
      await instance.methods.setValue(expectedValueBeforeTrace).send(options);

      // check the value is what we expect it to be: 1234
      const value = await instance.methods.value().call(options);
      assert.strictEqual(value, expectedValueBeforeTrace);
    });

    it("should trace a successful transaction without changing state", function() {
      // We want to trace the transaction that sets the value to 26
      const { accounts, instance, provider } = context;

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
            assert.strictEqual(lastop.pc, 209);
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
  });

  describe("Trace a successful transaction with multiple calls", function() {
    before("set up transaction with multiple calls to the same contract to be traced", async() => {
      const { accounts, instance } = context;
      options = { from: accounts[0], gas };

      // from previous tests, otherValue should be 26 + 1234
      let otherValue = await instance.methods.otherValue().call(options);
      assert.strictEqual(otherValue, "1265");

      let tx = await instance.methods.callSetValueTwice().send(options);
      multipleCallsHashToTrace = tx.transactionHash;

      // we add 1 + 2 to otherValue, so now it should be 1268
      let updatedValue = await instance.methods.otherValue().call(options);
      assert.strictEqual(updatedValue, "1268");
    });

    it("should trace a transaction with multiple calls to the same contract", async function() {
      const { web3 } = context;
      const provider = web3.currentProvider;
      let arrayOfStorageKeyValues = [];

      provider.send(
        {
          jsonrpc: "2.0",
          method: "debug_traceTransaction",
          params: [multipleCallsHashToTrace, []],
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
          // ensure the call to setValue with 1 was successfully stored for otherValue
          assert.strictEqual(
            arrayOfStorageKeyValues[1]["0000000000000000000000000000000000000000000000000000000000000001"],
            "00000000000000000000000000000000000000000000000000000000000004f2"
          );

          // ensure the call to setValue with 2 was successfully stored for value
          assert.strictEqual(
            arrayOfStorageKeyValues[2]["0000000000000000000000000000000000000000000000000000000000000000"],
            "0000000000000000000000000000000000000000000000000000000000000002"
          );
          // ensure the call to setValue with 2 was successfully stored for otherValue
          assert.strictEqual(
            arrayOfStorageKeyValues[3]["0000000000000000000000000000000000000000000000000000000000000001"],
            "00000000000000000000000000000000000000000000000000000000000004f4"
          );
        }
      );
    });
  });
});
