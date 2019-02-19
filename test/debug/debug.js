const assert = require("assert");
const { send } = require("../helpers/utils/rpc");
const bootstrap = require("../helpers/contract/bootstrap");

describe("Debug", async() => {
  const gas = 3141592;
  let hashToTrace = null;
  let expectedValueBeforeTrace = "1234";
  let context;

  before("Setting up web3 and contract", async function() {
    this.timeout(10000);

    const contractRef = {
      contractFiles: ["DebugContract"],
      contractSubdirectory: "debug"
    };

    const ganacheProviderOptions = {};

    context = await bootstrap(contractRef, ganacheProviderOptions);
  });

  before("set up transaction that should be traced", async() => {
    const { accounts, instance } = context;
    const debugValue = instance.methods.setValue(26);
    const { transactionHash } = await debugValue.send({ from: accounts[0], gas });
    const value = await instance.methods.value().call({ from: accounts[0], gas });
    assert.strictEqual(value, "26");
    // Set the hash to trace to the transaction we made, so we know preconditions
    // are set correctly.
    hashToTrace = transactionHash;
  });

  before("change state of contract to ensure trace doesn't overwrite data", async() => {
    const { accounts, instance } = context;
    await instance.methods.setValue(expectedValueBeforeTrace).send({ from: accounts[0], gas });
    const value = await instance.methods.value().call({ from: accounts[0], gas });
    assert.strictEqual(value, expectedValueBeforeTrace);
  });

  it("should trace a successful transaction without changing state", async() => {
    const { web3 } = context;
    // We want to trace the transaction that sets the value to 26
    const method = "debug_traceTransaction";
    const params = [hashToTrace, []];
    const { result } = await send(method, params, web3);
    const { structLogs } = result;

    // To at least assert SOMETHING, let's assert the last opcode
    assert(structLogs.length > 0);

    for (let opcode of structLogs) {
      if (opcode.stack.length > 0) {
        // check formatting of stack
        // formatting was broken when updating to ethereumjs-vm v2.3.3
        assert.strictEqual(opcode.stack[0].length, 64);
        assert.notStrictEqual(opcode.stack[0].substr(0, 2), "0x");
        break;
      }
    }

    const { op, gasCost, pc, storage } = structLogs[structLogs.length - 1];

    assert.strictEqual(op, "STOP");
    assert.strictEqual(gasCost, 1);
    assert.strictEqual(pc, 145);
    assert.strictEqual(
      storage["0000000000000000000000000000000000000000000000000000000000000000"],
      "000000000000000000000000000000000000000000000000000000000000001a"
    );
    assert.strictEqual(
      storage["0000000000000000000000000000000000000000000000000000000000000001"],
      "000000000000000000000000000000000000000000000000000000000000001f"
    );

    // await instance.methods.value().call({ from: accounts[0], gas });
  });
});
