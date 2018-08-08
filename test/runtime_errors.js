var Web3 = require('web3');
var assert = require('assert');
var Ganache = require("../index.js");
var fs = require("fs");
var path = require("path");
var solc = require("solc");
var to = require("../lib/utils/to");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");


function runTests(web3, provider, extraTests) {
  var testState = {
    accounts: null,
    ErrorContract: null,
    errorInstance: null,
    code: null
  }

  before("get accounts", function() {
    return web3.eth.getAccounts().then(function(accs) {
      testState.accounts = accs;
    });
  });

  before("compile source", function(done) {
    this.timeout(10000);

    var source = fs.readFileSync(path.join(__dirname, "RuntimeError.sol"), "utf8");
    var result = solc.compile({sources: {"RuntimeError.sol": source}}, 1);

    testState.code = "0x" + result.contracts["RuntimeError.sol:RuntimeError"].bytecode;
    var abi = JSON.parse(result.contracts["RuntimeError.sol:RuntimeError"].interface);

    testState.ErrorContract = new web3.eth.Contract(abi);
    testState.ErrorContract._code = testState.code;
    testState.ErrorContract.deploy({data: testState.code})
      .send({from: testState.accounts[0], gas: 3141592})
      .then(function(instance) {
        // TODO: ugly workaround - not sure why this is necessary.
        if (!instance._requestManager.provider) {
          instance._requestManager.setProvider(web3.eth._provider);
        }
        testState.errorInstance = instance;
        done();
      });
  });

  it("should output the transaction hash even if an runtime error occurs (out of gas)", function(done) {
    // we can't use `web3.eth.sendTransaction` because it will obfuscate the result
    web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "eth_sendTransaction",
      params: [{
        from: testState.accounts[0],
        data: testState.code
      }],
      id: 1
    }, function(err, result) {
      if (provider.options.vmErrorsOnRPCResponse) {
        // null & undefined are equivalent for equality tests, but I'm being
        // pedantic here for readability's sake
        assert(result.error !== null)
        assert(result.error !== undefined)
      } else {
        assert(result.error === undefined)
      }

      // null & undefined are equivalent for equality tests, but I'm being
      // pedantic here for readability's sake
      assert(result.result !== null);
      assert(result.result !== undefined);

      assert.equal(result.result.length, 66); // transaction hash
      done();
    });
  });

  it("should output the transaction hash even if a runtime error occurs (revert)", function(done) {
    // we can't use `web3.eth.sendTransaction` because it will obfuscate the result
    
      provider.send({
        jsonrpc: '2.0',
        id: new Date().getTime(),
        method: 'eth_sendTransaction',
        params: [{
          from: testState.accounts[0],
          to: testState.errorInstance.options.address,
          // calls error()
          data: '0xc79f8b62',
          gas: to.hex(3141592)
        }]
      }, function(err, response) {
        if (provider.options.vmErrorsOnRPCResponse) {
          // null & undefined are equivalent for equality tests, but I'm being
          // pedantic here for readability's sake
          assert(response.error !== null)
          assert(response.error !== undefined)

          assert(/revert/.test(response.error.message), `Expected error message (${response.error.message}) to contain 'revert'`);

        } else {
          assert(response.error === undefined)
        }

        // null & undefined are equivalent for equality tests, but I'm being
        // pedantic here for readability's sake
        assert(response.result !== null);
        assert(response.result !== undefined);

        assert.equal(response.result.length, 66); // transaction hash

        done();
      });
  });

  it("should have correct return value when calling a method that reverts without message", function(done) {    
      provider.send({
        jsonrpc: '2.0',
        id: new Date().getTime(),
        method: 'eth_call',
        params: [{
          from: testState.accounts[0],
          to: testState.errorInstance.options.address,
          // calls error()
          data: '0xc79f8b62',
          gas: to.hex(3141592)
        }]
      }, function(err, response) {
        if (provider.options.vmErrorsOnRPCResponse) {
          // null & undefined are equivalent for equality tests, but I'm being
          // pedantic here for readability's sake
          assert(response.error !== null)
          assert(response.error !== undefined)
          assert(response.result === undefined || response.result === null)

          assert(/revert/.test(response.error.message), `Expected error message (${response.error.message}) to contain 'revert'`);

        } else {
          assert(response.error === undefined)
          assert(response.result === "0x0")
        }

        done();
      });
  });

  it("should have correct return value when calling a method that reverts with message", function(done) {    
      provider.send({
        jsonrpc: '2.0',
        id: new Date().getTime(),
        method: 'eth_call',
        params: [{
          from: testState.accounts[0],
          to: testState.errorInstance.options.address,
          // calls error()
          data: '0xcd4aed30',
          gas: to.hex(3141592)
        }]
      }, function(err, response) {
        if (provider.options.vmErrorsOnRPCResponse) {
          // null & undefined are equivalent for equality tests, but I'm being
          // pedantic here for readability's sake
          assert(response.error !== null)
          assert(response.error !== undefined)
          assert(response.result === undefined || response.result === null)

          assert(/revert/.test(response.error.message), `Expected error message (${response.error.message}) to contain 'revert'`);

        } else {
          assert(response.error === undefined)
          assert(response.result === "0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000074d65737361676500000000000000000000000000000000000000000000000000")
        }

        done();
      });
  });

  if (extraTests) {
    extraTests(testState)
  }

  after('shutdown', function(done) {
    let provider = web3._provider;
    web3.setProvider();
    provider.close(done);
  });
}

describe("Runtime Errors with vmErrorsOnRPCResponse = true:", function() {
  var provider = Ganache.provider({
    vmErrorsOnRPCResponse: true
  });

  var web3 = new Web3(provider);

  runTests(web3, provider, function(testState) {
    it("should output instruction index on runtime errors", function(done) {
      provider.send({
        jsonrpc: '2.0',
        id: new Date().getTime(),
        method: 'eth_sendTransaction',
        params: [{
          from: testState.accounts[0],
          to: testState.errorInstance.options.address,
          // calls error()
          data: '0xc79f8b62',
          gas: to.hex(3141592)
        }]
      }, function(err, response) {

        let txHash = response.result

        assert(response.error);
        assert(response.error.data[txHash]);
        assert.equal(response.error.data[txHash].program_counter, 91); // magic number, will change if compiler changes.
        done();
      });
    });
  });

})

describe("Runtime Errors with vmErrorsOnRPCResponse = false:", function() {
  var provider = Ganache.provider({
    vmErrorsOnRPCResponse: false
  });

  var web3 = new Web3(provider);
  runTests(web3, provider)
})
