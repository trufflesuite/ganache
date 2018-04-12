var Ganache = require("../index.js");
var solc = require("solc");
var to = require("../lib/utils/to.js");
var async = require("async");
var Web3 = require('web3');
var fs = require("fs");
var assert = require("assert");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

var logger = {
  log: function(msg) { /*noop*/ }
};

/**
 * NOTE: Naming in these tests is a bit confusing. Here, the "main chain"
 * is the main chain the tests interact with; and the "forked chain" is the
 * chain that _was forked_. This is in contrast to general naming, where the
 * main chain represents the main chain to be forked (like the Ethereum live
 * network) and the fork chaing being "the fork".
 */

describe("Forking using a Provider", function() {
  var contract;
  var forkedProvider = Ganache.provider({
    logger: logger,
    seed: "main provider"
  });
  var mainProvider;
  var forkedWeb3 = new Web3(forkedProvider);
  var mainWeb3;
  var forkedAccounts;
  var contractAddress;

  var forkBlockNumber;
  var initialDeployTransactionHash;

  before("set up test data", function() {
    this.timeout(5000)
    var source = fs.readFileSync("./test/Example.sol", {encoding: "utf8"});
    var result = solc.compile(source, 1);

    // Note: Certain properties of the following contract data are hardcoded to
    // maintain repeatable tests. If you significantly change the solidity code,
    // make sure to update the resulting contract data with the correct values.
    contract = {
      solidity: source,
      abi: result.contracts[":Example"].interface,
      binary: "0x" + result.contracts[":Example"].bytecode,
      position_of_value: "0x0000000000000000000000000000000000000000000000000000000000000000",
      expected_default_value: 5,
      call_data: {
        gas: '0x2fefd8',
        gasPrice: '0x01', // This is important, as passing it has exposed errors in the past.
        to: null, // set by test
        data: '0x3fa4f245'
      },
      transaction_data: {
        from: null, // set by test
        gas: '0x2fefd8',
        to: null, // set by test
        data: '0x552410770000000000000000000000000000000000000000000000000000000000000019' // sets value to 25 (base 10)
      }
    };
  });

  before("Gather forked accounts", function(done) {
    forkedWeb3.eth.getAccounts(function(err, f) {
      if (err) return done(err);
      forkedAccounts = f;
      done();
    });
  });

  before("Deploy initial contracts", function(done) {
    forkedWeb3.eth.sendTransaction({
      from: forkedAccounts[0],
      data: contract.binary,
      gas: 3141592
    }, function(err, tx) {
      if (err) { return done(err); }

      // Save this for a later test.
      initialDeployTransactionHash = tx;

      forkedWeb3.eth.getTransactionReceipt(tx, function(err, receipt) {
        if (err) return done(err);

        contractAddress = receipt.contractAddress;

        forkedWeb3.eth.getCode(contractAddress, function(err, code) {
          if (err) return done(err);

          // Ensure there's *something* there.
          assert.notEqual(code, null);
          assert.notEqual(code, "0x");
          assert.notEqual(code, "0x0");

          done();
        });
      });
    });
  });

  before("Set up main provider and web3 instance", function() {
    mainProvider = Ganache.provider({
      fork: forkedProvider,
      logger: logger,
      seed: "forked provider"
    });
    mainWeb3 = new Web3(mainProvider);
  });

  // NOTE: This is the only real test in this file. Since we have another forking test file filled
  // with good tests, this one simply ensures the forked feature still works by testing that we can
  // grab data from the forked chain when a provider instance is passed (instead of a URL). If this
  // one passes, it should follow that the rest of the forking features should work as normal.
  it("gets code correctly via the main chain (i.e., internally requests it from forked chain)", function(done) {
    mainWeb3.eth.getCode(contractAddress, function(err, code) {
      if (err) return done(err);

      // Ensure there's *something* there.
      assert.notEqual(code, null);
      assert.notEqual(code, "0x");
      assert.notEqual(code, "0x0");

      done();
    });
  });

});
