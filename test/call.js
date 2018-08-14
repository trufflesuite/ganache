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

describe("eth_call", function() {
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

  before("compile source and deploy", function() {
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

  it("should use the block gas limit if no gas limit is specified", function() {
    // this call uses more than the default transaction gas limit and will
    // therefore fail if the block gas limit isn't used for calls
    return estimateGasInstance.methods.add(toBytes("Tim"), toBytes("A great guy"), 5)
      .call({from: accounts[0]})
      .then(result => {
        assert.equal(result, true)
      })
  })

  function toBytes(s) {
    let bytes = Array.prototype.map.call(s, function(c) {
      return c.codePointAt(0)
    })

    return to.hex(Buffer.from(bytes))
  }

});
