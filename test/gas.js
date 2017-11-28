var Web3 = require('web3');
var assert = require('assert');
var TestRPC = require("../index.js");
var fs = require("fs");
var path = require("path");
var solc = require("solc");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Gas Estimation", function() {
  var web3 = new Web3(TestRPC.provider());
  var accounts;
  var EstimateGasContract;
  var EstimateGas;
  var source = fs.readFileSync(path.join(__dirname, "EstimateGas.sol"), "utf8");

  before("get accounts", function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  before("compile source", function(done) {
    this.timeout(10000);
    var result = solc.compile({sources: {"EstimateGas.sol": source}}, 1);

    var code = "0x" + result.contracts["EstimateGas.sol:EstimateGas"].bytecode;
    var abi = JSON.parse(result.contracts["EstimateGas.sol:EstimateGas"].interface);

    EstimateGasContract = web3.eth.contract(abi);
    EstimateGasContract._code = code;
    EstimateGasContract.new({data: code, from: accounts[0], gas: 3141592}, function(err, instance) {
      if (err) return done(err);
      if (!instance.address) return;

      EstimateGas = instance;

      done();
    });
  });

  function verifyGas(txHash, gasEstimate, done) {
    // Get the gas usage.
    web3.eth.getTransactionReceipt(txHash, function(err, receipt) {
      if (err) return done(err);

      // When instamining, gasUsed and cumulativeGasUsed should be the same.
      assert.equal(receipt.gasUsed, gasEstimate);
      assert.equal(receipt.cumulativeGasUsed, gasEstimate);

      done();
    });
  }

  function testTransactionEstimate(contractFn, args, done) {
    var estimate = contractFn.estimateGas.bind.apply(contractFn.estimateGas, [contractFn].concat(args));
    var transaction = contractFn.bind.apply(contractFn, [contractFn].concat(args));

    estimate(function(err, estimate) {
      if (err) return done(err);

      // Now perform the actual transaction
      transaction(function(err, tx) {
        if (err) return done(err);

        verifyGas(tx, estimate, done);
      })
    })
  }

  it("matches estimate for deployment", function(done) {
    web3.eth.estimateGas({ data: EstimateGasContract._code, from: accounts[0]}, function(err, gasEstimate) {
      if (err) assert.fail(err);

      verifyGas(EstimateGas.transactionHash, gasEstimate, done);
    });
  });

  it("matches usage for complex function call (add)", function(done) {
    testTransactionEstimate(EstimateGas.add, ["Tim", "A great guy", 5, {from: accounts[0], gas: 3141592}], done);
  });

  it("matches usage for complex function call (transfer)", function(done) {
    testTransactionEstimate(EstimateGas.transfer, ["0x0123456789012345678901234567890123456789", 5, "Tim", {from: accounts[0], gas: 3141592}], done);
  });

});
