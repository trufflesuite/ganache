var Web3 = require('web3');
var assert = require('assert');
var Ganache = require(process.env.TEST_BUILD ? "../build/ganache.core." + process.env.TEST_BUILD + ".js" : "../index.js");
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

  describe("Refunds", function() {
    var EstimateGasContract;
    var estimateGasContractData;
    before("compile source", function() {
      this.timeout(10000);

      var source = fs.readFileSync(path.join(__dirname, "EstimateGas.sol"), "utf8");
      var result = solc.compile({sources: {"EstimateGas.sol": source}}, 1);

      var estimateGasContractAbi = JSON.parse(result.contracts["EstimateGas.sol:EstimateGas"].interface);

      estimateGasContractData = "0x" + result.contracts["EstimateGas.sol:EstimateGas"].bytecode;
      EstimateGasContract = new web3.eth.Contract(estimateGasContractAbi);
    });

    async function deployContract(){
      return EstimateGasContract.deploy({data: estimateGasContractData})
      .send({from: accounts[0], gas: 3141592})
      .then(function(instance) {
        // TODO: ugly workaround - not sure why this is necessary.
        if (!instance._requestManager.provider) {
          instance._requestManager.setProvider(web3.eth._provider);
        }
        return instance;
      });
    }

    it("accounts for Rsclear Refund in gasEstimate", async () => {
      const from = accounts[0];
      const options = {from, gas: 5000000};
      const estimateGasInstance = await deployContract();
      return estimateGasInstance.methods.reset().send(options)  // prime storage by making sure it is set to 0
        .then(() => {
          const method = estimateGasInstance.methods.triggerRsclearRefund();

          return method.estimateGas(options)
            .then((gas)=>{
              return {from, gas};
            }).then(options => {
              const gasEstimate = options.gas;
              return method.send(options).then(receipt=>({gasEstimate, receipt}));
            }).then(data => {
              assert.strictEqual(data.receipt.gasUsed, data.gasEstimate - 15000);
              assert.strictEqual(data.receipt.gasUsed, data.receipt.cumulativeGasUsed);
            });
      });
    });
    
    
    it("accounts for Rselfdestruct Refund in gasEstimate", async () => {
      const from = accounts[0];
      const options = {from, gas: 5000000};
      const estimateGasInstance = await deployContract();
      return estimateGasInstance.methods.reset().send(options)  // prime storage by making sure it is set to 0
        .then(() => {
          const method = estimateGasInstance.methods.triggerRselfdestructRefund();

          return method.estimateGas(options)
            .then((gas)=>{
              return {from, gas};
            }).then(options => {
              const gasEstimate = options.gas;
              return method.send(options).then(receipt=>({gasEstimate, receipt}));
            }).then(data => {
              assert.strictEqual(data.receipt.gasUsed, data.gasEstimate - 24000);
              assert.strictEqual(data.receipt.gasUsed, data.receipt.cumulativeGasUsed);
            });
      });
    });

    it("accounts for Rsclear and Rselfdestruct Refunds in gasEstimate", async () => {
      const from = accounts[0];
      const estimateGasInstance = await deployContract();
      return estimateGasInstance.methods.reset().send({from, gas: 5000000})  // prime storage by making sure it is set to 0
        .then(() => {
          const method = estimateGasInstance.methods.triggerAllRefunds();

          return method.estimateGas({from})
            .then((gas)=>{
              return {from, gas};
            }).then(options => {
              const gasEstimate = options.gas;
              return method.send(options).then(receipt=>({gasEstimate, receipt}));
            }).then(data => {
              assert.strictEqual(data.receipt.gasUsed, data.gasEstimate - 24000 - 15000);
              assert.strictEqual(data.receipt.gasUsed, data.receipt.cumulativeGasUsed);
            });
      });
    }).timeout(0);

    it("clears mapping storage slots", async () =>{
      const options = {from: accounts[0]};

      const estimateGasInstance = await deployContract();
      const uintsa = await estimateGasInstance.methods.uints(1).call();
      assert.equal(uintsa, "0", "initial value is not correct");

      const receipta = await estimateGasInstance.methods.store(1).send(options);
      assert.equal(receipta.status, true, "storing value did not work");

      const uintsb = await estimateGasInstance.methods.uints(1).call();
      assert.equal(uintsb, "1", "set value is incorrect");

      const receiptb = await estimateGasInstance.methods.clear().send(options);
      assert.equal(receiptb.status, true, "clearing value did not work");

      const uintsc = await estimateGasInstance.methods.uints(1).call();
      assert.equal(uintsc, "0", "cleared value is not correct");
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

      return estimateGasInstance.methods.reset().send({from: options.from, gas: 5000000})  // prime storage by making sure it is set to 0
        .then(() => {
          const fn = contractFn(...args);
          return fn
            .estimateGas(options)
            .then(function(estimate) {
              options.gas = transactionGas
              return fn.send(options)
                .then(function (receipt) {
                  assert.equal(receipt.status, 1, 'Transaction must succeed');
                  assert.equal(receipt.gasUsed, estimate, "gasUsed");
                  assert.equal(receipt.cumulativeGasUsed, estimate, "estimate");
                })
        });
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
      return testTransactionEstimate(estimateGasInstance.methods.add, [toBytes("Tim"), toBytes("A great guy"), 10], {from: accounts[0], gas: 3141592});
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
    it('should calculate cumalativeGas and gasUsed correctly when multiple transactions are in a block', function (done){
      let tempWeb3 = new Web3(Ganache.provider({
        blockTime: .5, // seconds
        mnemonic: "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"
      }));

      const accounts = [ // configured with mnemonic
        '0x627306090abab3a6e1400e9345bc60c78a8bef57',
        '0xf17f52151ebef6c7334fad080c5704d77216b732',
      ];
      const secretKeys = [ // configured with mnemonic
          '0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3'
      ];

      let transaction = {
        "value": "0x10000000",
        "gasLimit": "0x33450",
        "from": accounts[0],
        "to": accounts[1],
        "nonce": "0x0"
      }

      let transaction2 = {
        "value": "0x10000000",
        "gasLimit": "0x33450",
        "from": accounts[0],
        "to": accounts[1],
        "nonce": "0x1" 
      }
      let transaction3 = {
        "value": "0x10000000",
        "gasLimit": "0x33450",
        "from": accounts[1],// <
        "to": accounts[0], // <^ reversed tx order
        "nonce": "0x0" 
      }

      // Precondition
      tempWeb3.eth.getBlockNumber(function(err, number){
        assert.deepEqual(number, 0, 'Current Block Should be 0')
      });

      tempWeb3.eth.sendTransaction(transaction, function(err, hash1) {
        if (err) return done(err);
        // Ensure there's no receipt since the transaction hasn't yet been processed. Ensure IntervalMining
        tempWeb3.eth.getTransactionReceipt(hash1, function(errTxRcpt1, receipt) {
          if (errTxRcpt1) return done(errTxRcpt1);
          assert.equal(receipt, null, "No receipt since the transaction hasn't yet been processed.");
          // Issue second transaction
          tempWeb3.eth.sendTransaction(transaction2, function(errSndTx2, hash2) {
            if (errSndTx2) return done(errSndTx2);
            tempWeb3.eth.sendTransaction(transaction3, function(errSndTx3, hash3) {
              if(errSndTx3) return done(errSndTx3);
              setTimeout(function() {
                // Wait .75 seconds (1.5x the mining interval) then get the receipt. It should be processed.
                tempWeb3.eth.getBlockNumber(function(err3, number){
                  assert.deepEqual(number, 1, 'Current Block Should be 1');
                });
                tempWeb3.eth.getBlock(1, function(getBlockErr, block){
                  if(getBlockErr) done(getBlockErr);
                  console.log(block);
                  tempWeb3.eth.getTransactionReceipt(hash1, function(err5, receipt1) {
                    tempWeb3.eth.getTransactionReceipt(hash2, function(err4, receipt2) {
                      tempWeb3.eth.getTransactionReceipt(hash3, function(err5, receipt3) {
                        assert.deepEqual(receipt1.gasUsed, receipt2.gasUsed, 'Tx1 and Tx2 should cost the same gas.');
                        assert.deepEqual(receipt2.gasUsed, receipt3.gasUsed, 'Tx2 and Tx3 should cost the same gas. -> Tx1 gas === Tx3 gas Transitive');
                        assert.deepEqual(receipt2.transactionIndex > receipt3.transactionIndex, true, '(Tx3 has a lower nonce) -> (Tx3 index is < Tx2 index)');
                        // ( Tx3 has a lower nonce -> Tx3 index is < Tx2 index ) -> cumulative gas Tx2 > Tx3 > Tx1
                        let isAccumulating = (receipt2.cumulativeGasUsed > receipt3.cumulativeGasUsed) && (receipt3.cumulativeGasUsed > receipt1.cumulativeGasUsed);
                        assert.deepEqual(isAccumulating, true, 'Cumulative gas should be accumulating for any transactions in the same block.');
                        assert.deepEqual(receipt1.gasUsed, receipt1.cumulativeGasUsed, 'Gas and cumulative gas should be equal for the FIRST Tx.');
                        assert.notDeepEqual(receipt2.gasUsed, receipt2.cumulativeGasUsed, 'Gas and cumulative gas should NOT be equal for the Second Tx.');
                        assert.notDeepEqual(receipt3.gasUsed, receipt3.cumulativeGasUsed, 'Gas and cumulative gas should NOT be equal for the Third Tx.');
                        let totalGas = receipt1.gasUsed + receipt2.gasUsed + receipt3.gasUsed;
                        assert.deepEqual(totalGas, receipt2.cumulativeGasUsed, "Total Gas should be equal the final tx.cumulativeGas")
                        assert.deepEqual(totalGas, block.gasUsed, "Total Gas should be equal to the block.gasUsed")
                        done();
                      });
                    });
                  });
                });
              }, 750);
            });
          });
        });
      });
    });
  });
});
