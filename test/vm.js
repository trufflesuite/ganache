var Web3 = require('web3');
var Transaction = require('ethereumjs-tx');
var utils = require('ethereumjs-util');
var assert = require('assert');
var Ganache = require("../index.js");
var solc = require("solc");
var fs = require("fs");
var to = require("../lib/utils/to");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

var logger = {
  log: function(message) {
    //console.log(message);
  }
};

var web3 = new Web3();
web3.setProvider(Ganache.provider({
  /*blockTime: 100,*/
  logger: logger,
  seed: "1337"
}));

describe("revert opcode", function() {
  var testContext = {};

  before(function (done) {
    this.timeout(10000);
    testContext.source = fs.readFileSync("./test/Revert.sol", {encoding: "utf8"});
    testContext.solcResult = solc.compile(testContext.source, false);

    testContext.revertContract = {
      solidity: testContext.source,
      abi: testContext.solcResult.contracts[":Revert"].interface,
      binary: "0x" + testContext.solcResult.contracts[":Revert"].bytecode,
      runtimeBinary: '0x' + testContext.solcResult.contracts[":Revert"].runtimeBytecode
    };

    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);

      testContext.accounts = accs;

      return done();
    });
  });

  it("should return a transaction receipt with status 0 on REVERT", function() {
    var revertCode = testContext.revertContract.binary;
    var revertAbi = JSON.parse(testContext.revertContract.abi);

    var RevertContract = new web3.eth.Contract(revertAbi);
    RevertContract._code = revertCode;
    return RevertContract.deploy({ data: revertCode })
      .send({from: testContext.accounts[0], gas: 3141592 })
      .then(function (instance) {
        // TODO: ugly workaround - not sure why this is necessary.
        if (!instance._requestManager.provider) {
          instance._requestManager.setProvider(web3.eth._provider);
        }
        return instance.methods.alwaysReverts(5).send({ from: testContext.accounts[0] })
      })
      .catch(function(err){
        assert.equal(err.results[err.hashes[0]].error, "revert", "Expected error result not returned.");
        return web3.eth.getTransactionReceipt(err.hashes[0])
      })
      .then(function(receipt) {
        assert.notEqual(receipt, null, "Transaction receipt shouldn't be null");
        assert.equal(receipt.status, 0, "Reverted (failed) transactions should have a status of 0.");
      });
  });
});
