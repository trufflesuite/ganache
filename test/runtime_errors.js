var Web3 = require('web3');
var assert = require('assert');
var TestRPC = require("../index.js");
var fs = require("fs");
var path = require("path");
var solc = require("solc");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Runtime Errors", function() {
  var web3 = new Web3(TestRPC.provider());
  var accounts;
  var RuntimeErrorContract;
  var RuntimeError;
  var source = fs.readFileSync(path.join(__dirname, "RuntimeError.sol"), "utf8");

  before("get accounts", function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  before("compile source", function(done) {
    this.timeout(10000);
    var result = solc.compile({sources: {"RuntimeError.sol": source}}, 1);

    var code = "0x" + result.contracts.RuntimeError.bytecode;
    var abi = JSON.parse(result.contracts.RuntimeError.interface);

    RuntimeErrorContract = web3.eth.contract(abi);
    RuntimeErrorContract._code = code;
    RuntimeErrorContract.new({data: code, from: accounts[0], gas: 3141592}, function(err, instance) {
      if (err) return done(err);
      if (!instance.address) return;

      RuntimeError = instance;

      done();
    });
  });

  it("should output instruction index on runtime errors", function(done) {
    // This should execute immediately.
    RuntimeError.error({from: accounts[0], gas: 3141592}, function(err) {
      assert(err.hashes.length > 0);
      assert(Object.keys(err.results).length > 0);
      assert.equal(err.results[err.hashes[0]].program_counter, 44); // magic number, will change if compiler changes.
      done();
    });
  });

})
