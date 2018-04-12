var Web3 = require('web3');
var assert = require('assert');
var Ganache = require("../index.js");
var fs = require("fs");
var path = require("path");
var solc = require("solc");
var to = require("../lib/utils/to")

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Transaction rejection", function() {
  var provider = Ganache.provider({
    // important: we want to make sure we get tx rejections as rpc errors even
    // if we don't want runtime errors as RPC erros
    vmErrorsOnRPCResponse: false
  })

  var web3 = new Web3(provider);

  var accounts;
  var estimateGasContractData;
  var estimateGasContractAbi;
  var EstimateGasContract;
  var EstimateGasContractAddress;
  var estimateGasInstance;
  var deploymentReceipt;
  var estimateGasContractAddress;
  var source = fs.readFileSync(path.join(__dirname, "EstimateGas.sol"), "utf8");

  before("get accounts", function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  before("lock account 1", function() {
    return web3.eth.personal.lockAccount(accounts[1])
  })

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
        estimateGasContractAddress = to.hex(instance.options.address);
      });
  });

  it("should reject transaction if nonce is incorrect", function(done) {
    testTransactionForRejection({
      nonce: 0xffff
    }, /the tx doesn't have the correct nonce/, done)
  });

  it("should reject transaction if from account is missing", function(done) {
    testTransactionForRejection({
      from: undefined
    }, /from not found; is required/, done)
  });

  it("should reject transaction if from account is invalid/unknown", function(done) {
    testTransactionForRejection({
      from: '0x0000000000000000000000000000000000000001'
    }, /sender account not recognized/, done)
  });

  it("should reject transaction if from known account which is locked", function(done) {
    testTransactionForRejection({
      from: accounts[1],
    }, /signer account is locked/, done)
  });

  it("should reject transaction if gas limit exceeds block gas limit", function(done) {
    testTransactionForRejection({
      gas: 0xFFFFFFFF,
    }, /Exceeds block gas limit/, done)
  });

  it("should reject transaction if insufficient funds", function(done) {
    testTransactionForRejection({
      value: web3.utils.toWei('100000', 'ether')
    }, /sender doesn't have enough funds to send tx/, done)
  });

  it("should reject contract transaction if 'to' is not a contract address", function(done) {
    let params = {
      to: '0x0000000000000000000000001234000000000000'
    }

    testTransactionForRejection(
      params,
      new RegExp(`Attempting to run transaction which calls a contract function, but recipient address ${params.to} is not a contract address`),
      done
    )
  });

  function testTransactionForRejection(paramsOverride, messageRegex, done) {
    let params = Object.assign({
      from: accounts[0],
      to: estimateGasContractAddress,
      gas: to.hex(3141592),
      data: '0x91ea8a0554696d000000000000000000000000000000000000000000000000000000000041206772656174206775790000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005'
    }, paramsOverride)

    let request = {
      jsonrpc: 2.0,
      id: new Date().getTime(),
      method: 'eth_sendTransaction',
      params: [ params ]
    }

    // don't send with web3 because it'll inject its own checks
    provider.send(request, (err, response) => {
      // cyclomatic complexity? what's that? :-(
      if (response.error) {
        if (response.error.message) {
          if (messageRegex.test(response.error.message)) {
            // success!
            return done()
          } else {
            // wrong error message
            return done(new Error(`Expected error message matching ${messageRegex}, got ${response.error.message}`))
          }
        } else {
          return done(new Error(`Error was returned which had no message`))
        }
      } else if (response.result) {
        web3.eth.getTransactionReceipt(response.result)
          .then((result) => {
            if (to.number(result.status) == 0) {
              return done(new Error('TX rejections should return error, but returned receipt with zero status instead'))
            } else {
              return done(new Error(`TX should have rejected prior to running. Instead transaction ran successfully (receipt.status == ${to.number(result.status)})`))
            }
          }).catch(error => {
            return done(error)
          })
      } else {
        return done(new Error('eth_sendTransaction responded with empty RPC response'))
      }
    })
  }
})
