var Web3 = require('web3');
var assert = require('assert');
var Ganache = require("../index.js");
var fs = require("fs");
var path = require("path");
var solc = require("solc");
var to = require("../lib/utils/to.js");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Gas Estimation", function() {
  var web3 = new Web3(Ganache.provider({}));
  var accounts;
  var estimateGasContractData;
  var estimateGasContractAbi;
  var EstimateGasContract;
  var estimateGasInstance;
  var deploymentReceipt;
  var source = fs.readFileSync(path.join(__dirname, "EstimateGas.sol"), "utf8");

  before("get accounts", function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  before("compile source", function() {
    this.timeout(10000);
    var result = solc.compile({sources: {"EstimateGas.sol": source}}, 1);

    estimateGasContractData = "0x" + result.contracts["EstimateGas.sol:EstimateGas"].bytecode;
    estimateGasContractAbi = JSON.parse(result.contracts["EstimateGas.sol:EstimateGas"].interface);

    EstimateGasContract = new web3.eth.Contract(estimateGasContractAbi);
    return EstimateGasContract.deploy({data: estimateGasContractData})
      .send({from: accounts[0], gas: 3141592})
      .on('receipt', function (receipt) {
        deploymentReceipt = receipt;
      })
      .then(function(instance) {
        // TODO: ugly workaround - not sure why this is necessary.
        if (!instance._requestManager.provider) {
          instance._requestManager.setProvider(web3.eth._provider);
        }
        estimateGasInstance = instance;
      });
  });

  function testTransactionEstimate(contractFn, args, options) {
    let transactionGas = options.gas
    delete options.gas

    return contractFn.apply(contractFn, args)
    .estimateGas(options)
    .then(function(estimate) {
      options.gas = transactionGas
      return web3.eth.sendTransaction(Object.assign(contractFn.apply(contractFn, args), options))
        .then(function (receipt) {
          assert.equal(receipt.status, 1, 'Transaction must succeed');
          assert.equal(receipt.gasUsed, estimate);
          assert.equal(receipt.cumulativeGasUsed, estimate);
        })
    });
  }

  it("matches estimate for deployment", function() {
    let contract = new web3.eth.Contract(estimateGasContractAbi);
    contract.deploy({ data: estimateGasContractData })
      .estimateGas({ from: accounts[1]})
      .then(function(gasEstimate) {
        assert.deepEqual(deploymentReceipt.gasUsed, gasEstimate);
        assert.deepEqual(deploymentReceipt.cumulativeGasUsed, gasEstimate);
      });
  });

  it("matches usage for complex function call (add)", function() {
    this.timeout(10000)
    return testTransactionEstimate(estimateGasInstance.methods.add, [toBytes("Tim"), toBytes("A great guy"), 5], {from: accounts[0], gas: 3141592});
  });

  it("matches usage for complex function call (transfer)", function() {
    this.timeout(10000)
    return testTransactionEstimate(estimateGasInstance.methods.transfer, ["0x0123456789012345678901234567890123456789", 5, toBytes("Tim")], {from: accounts[0], gas: 3141592});
  });

  function toBytes(s) {
    let bytes = Array.prototype.map.call(s, function(c) {
      return c.codePointAt(0)
    })

    return to.hex(Buffer.from(bytes))
  }

});
