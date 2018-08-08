var Web3 = require('web3');
var assert = require('assert');
var Ganache = require("../index.js");
var fs = require("fs");
var path = require("path");
var solc = require("solc");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Debug", function() {
  var provider;
  var web3
  var accounts;
  var DebugContract;
  var debugContract;
  var source = fs.readFileSync(path.join(__dirname, "DebugContract.sol"), "utf8");
  var hashToTrace = null;
  var expectedValueBeforeTrace = 1234;

  before("init web3", function() {
    provider = Ganache.provider();
    web3 = new Web3(provider);
  });

  before("get accounts", function() {
    return web3.eth.getAccounts().then(accs => {
      accounts = accs;
    });
  });

  before("compile source", function() {
    this.timeout(10000);
    var result = solc.compile({sources: {"DebugContract.sol": source}}, 1);

    var code = "0x" + result.contracts["DebugContract.sol:DebugContract"].bytecode;
    var abi = JSON.parse(result.contracts["DebugContract.sol:DebugContract"].interface);

    DebugContract = new web3.eth.Contract(abi);
    DebugContract._code = code;

    return DebugContract.deploy({ data: code }).send({from: accounts[0], gas: 3141592}).then(instance => {
      debugContract = instance;

      // TODO: ugly workaround - not sure why this is necessary.
      if (!debugContract._requestManager.provider) {
        debugContract._requestManager.setProvider(web3.eth._provider);
      }
    });
  });

  before("set up transaction that should be traced", function() {
    // This should execute immediately.
    var setValueTx = debugContract.methods.setValue(26)
    var tx;
    return setValueTx.send({from: accounts[0], gas: 3141592}).then(result => {
        // Check the value first to make sure it's 26
        tx = result;
        return debugContract.methods.value().call({from: accounts[0], gas: 3141592});
    }).then(value => {
      assert.equal(value, 26);

      // Set the hash to trace to the transaction we made, so we know preconditions
      // are set correctly.
      hashToTrace = tx.transactionHash;
    });
  });

  before("change state of contract to ensure trace doesn't overwrite data", function() {
    // This should execute immediately.
    return debugContract.methods.setValue(expectedValueBeforeTrace).send({from: accounts[0], gas: 3141592}).then(tx => {
      // Make sure we set it right.
      return debugContract.methods.value().call({from: accounts[0], gas: 3141592})
    }).then(value => {
        // Now that it's 85, we can trace the transaction that set it to 26.
        assert.equal(value, expectedValueBeforeTrace);
    });
  });

  it("should trace a successful transaction without changing state", function() {
    // We want to trace the transaction that sets the value to 26
    return new Promise((accept, reject) => {
      provider.send({
        jsonrpc: "2.0",
        method: "debug_traceTransaction",
        params: [hashToTrace, []],
        id: new Date().getTime()
      }, function(err, response) {
        if (err) reject(err);
        if (response.error) reject(response.error);

        var result = response.result;

        // To at least assert SOMETHING, let's assert the last opcode
        assert(result.structLogs.length > 0);

        for (let op of result.structLogs) {
          if (op.stack.length > 0) {
            // check formatting of stack
            // formatting was broken when updating to ethereumjs-vm v2.3.3
            assert.equal(op.stack[0].length, 64)
            assert.notEqual(op.stack[0].substr(0, 2), '0x')
            break
          }
        }
        var lastop = result.structLogs[result.structLogs.length - 1];

        assert.equal(lastop.op, "STOP");
        assert.equal(lastop.gasCost, 1);
        assert.equal(lastop.pc, 145);
        assert.equal(lastop.storage['0000000000000000000000000000000000000000000000000000000000000000'], '000000000000000000000000000000000000000000000000000000000000001a')
        assert.equal(lastop.storage['0000000000000000000000000000000000000000000000000000000000000001'], '000000000000000000000000000000000000000000000000000000000000001f')

        accept();
     });
    }).then(() => {
      // Now let's make sure rerunning this transaction trace didn't change state
      return debugContract.methods.value().call({from: accounts[0], gas: 3141592})
    });then(value => {
        // Did it change state?
        assert.equal(value, expectedValueBeforeTrace);
    });
  });
})
