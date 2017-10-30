var Web3 = require('web3');
var Transaction = require('ethereumjs-tx');
var utils = require('ethereumjs-util');
var assert = require('assert');
var TestRPC = require("../index.js");
var solc = require("solc");
var fs = require("fs");
var to = require("../lib/utils/to");
var clone = require("clone");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

var logger = {
  log: function(message) {
    //console.log(message);
  }
};

var web3 = new Web3();
web3.setProvider(TestRPC.provider({
  /*blocktime: 100,*/
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

      web3.personal.newAccount("password", function(err, result) {
        testContext.personalAccount = result;
        done();
      });
    });
  });

  it("should return a transaction receipt with status 0 on REVERT", function(done) {
    var revertCode = testContext.revertContract.binary;
    var revertAbi = JSON.parse(testContext.revertContract.abi);

    var RevertContract = web3.eth.contract(revertAbi);
    RevertContract._code = revertCode;
    RevertContract.new({ data: revertCode, from: testContext.accounts[0], gas: 3141592 }, function (err, instance) {
      if (err) {
        return done(err);
      }

      var testCall = function(instance) {
        instance.alwaysReverts(5, { from: testContext.accounts[0] }, function(err, result) {
          assert(err, "Expected error result not returned.");
          var txHash = err.hashes[0];

          web3.eth.getTransactionReceipt(txHash, function(err, receipt) {
            if (err) {
              return done(err);
            }

            assert.notEqual(receipt, null, "Transaction receipt shouldn't be null");
            assert.equal(receipt.status, 0, "Reverted (failed) transactions should have a status of 0.");
            done();
          });
        });
      }

      if (!instance.address) {
        web3.eth.getTransactionReceipt(instance.transactionHash, function(err, receipt) {
          if (err) {
            return done(err);
          }

          assert.notEqual(receipt, null, "Transaction receipt shouldn't be null");
          assert.notEqual(receipt.contractAddress, null, "Transaction did not create a contract");
            assert.equal(receipt.status, 1, "Successful transactions should have a status of 1.");
          testCall(RevertContract.at(receipt.contractAddress));
        });
      } else {
        testCall(instance);
      }

    });
  });
});
