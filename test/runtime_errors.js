var Web3 = require('web3');
var assert = require('assert');
var TestRPC = require("../index.js");
var fs = require("fs");
var path = require("path");
var solc = require("solc");
var RuntimeError = require("../lib/utils/runtimeerror");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Runtime Errors", function() {
  var web3 = new Web3(TestRPC.provider());
  var accounts;
  var ErrorContract;
  var errorInstance;
  var code;

  before("get accounts", function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  before("compile source", function(done) {
    this.timeout(10000);

    var source = fs.readFileSync(path.join(__dirname, "RuntimeError.sol"), "utf8");
    var result = solc.compile({sources: {"RuntimeError.sol": source}}, 1);

    code = "0x" + result.contracts["RuntimeError.sol:RuntimeError"].bytecode;
    var abi = JSON.parse(result.contracts["RuntimeError.sol:RuntimeError"].interface);

    ErrorContract = web3.eth.contract(abi);
    ErrorContract._code = code;
    ErrorContract.new({data: code, from: accounts[0], gas: 3141592}, function(err, instance) {
      if (err) return done(err);
      if (!instance.address) return;

      errorInstance = instance;

      done();
    });
  });

  it("should output instruction index on runtime errors", function(done) {
    // This should execute immediately.
    errorInstance.error({from: accounts[0], gas: 3141592}, function(err) {
      assert(err.hashes.length > 0);
      assert(Object.keys(err.results).length > 0);

      //TODO: replace this w/ an address lookup, or a precompiled contract
      assert.equal(err.results[err.hashes[0]].program_counter, 77); // magic number, will change if compiler changes.
      done();
    });
  });

  it("should output the transaction hash even if a runtime error occurs", function(done) {
    // we can't use `web3.eth.sendTransaction` because it will obfuscate the result
    web3.currentProvider.sendAsync({
      jsonrpc: "2.0",
      method: "eth_sendTransaction",
      params: [{
        from: accounts[0],
        data: code
      }],
      id: 1
    }, function(err, result) {
      assert(err != null);
      assert(err instanceof RuntimeError);
      assert.equal(result.result.length, 66); // transaction hash
      done();
    });
  });

})
