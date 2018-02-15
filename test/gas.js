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

let mnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

describe("Gas", function() {
  var provider = new Ganache.provider({mnemonic});
  var web3 = new Web3(provider);
  var accounts;

  before("get accounts", function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  describe("Estimation", function() {
    var estimateGasContractData;
    var estimateGasContractAbi;
    var EstimateGasContract;
    var estimateGasInstance;
    var deploymentReceipt;
    var source = fs.readFileSync(path.join(__dirname, "EstimateGas.sol"), "utf8");

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

  describe('Expenditure', function() {
    var testGasExpenseIsCorrect = function(expectedGasPrice, setGasPriceOnTransaction = false, w3 = web3) {
      let initialBalance;
      let gasUsed;
      let transferAmount = w3.utils.toBN(w3.utils.toWei('5', 'finney'))

      expectedGasPrice = w3.utils.toBN(expectedGasPrice)

      return w3.eth.getBalance(accounts[0])
        .then(balance => {
          initialBalance = w3.utils.toBN(balance)

          let params = {
            from: accounts[0],
            to: accounts[1],
            value: transferAmount
          }

          if (setGasPriceOnTransaction) {
            params.gasPrice = expectedGasPrice
          }

          return w3.eth.sendTransaction(params)
        })
        .then(receipt => {
          gasUsed = w3.utils.toBN(receipt.gasUsed)
          return w3.eth.getBalance(accounts[0])
        })
        .then(balance => {
          let finalBalance = w3.utils.toBN(balance)
          let deltaBalance = initialBalance.sub(finalBalance)

          // the amount we paid in excess of our transferAmount is what we spent on gas
          let gasExpense = deltaBalance.sub(transferAmount)

          assert(!gasExpense.eq(w3.utils.toBN('0')), 'Calculated gas expense must be nonzero.')
          // gas expense is just gasPrice * gasUsed, so just solve accordingly
          let actualGasPrice = gasExpense.div(gasUsed)

          assert(expectedGasPrice.eq(actualGasPrice), `Gas price used by EVM (${to.hex(actualGasPrice)}) was different from expected gas price (${to.hex(expectedGasPrice)})`)
        })
    }
      
    it('should calculate gas expenses correctly in consideration of the default gasPrice', function() {
      return web3.eth.getGasPrice().then(testGasExpenseIsCorrect)
    })

    it('should calculate gas expenses correctly in consideration of the requested gasPrice', function() {
      return testGasExpenseIsCorrect('0x10000', true)
    })

    it('should calculate gas expenses correctly in consideration of a user-defined default gasPrice', function() {
      let gasPrice = '0x2000'
      return testGasExpenseIsCorrect(gasPrice, false, new Web3(Ganache.provider({ mnemonic, gasPrice })))
    })
  })
});
