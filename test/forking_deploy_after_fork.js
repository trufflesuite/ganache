var Web3 = require('web3');
var Web3WsProvider = require('web3-providers-ws');
var utils = require('ethereumjs-util');
var assert = require('assert');
var Ganache = require("../index.js");
var fs = require("fs");
var solc = require("solc");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

var logger = {
  log: function(msg) { /*console.log(msg)*/ }
};

/**
 * NOTE: Naming in these tests is a bit confusing. Here, the "main chain"
 * is the main chain the tests interact with; and the "forked chain" is the
 * chain that _was forked_. This is in contrast to general naming, where the
 * main chain represents the main chain to be forked (like the Ethereum live
 * network) and the fork chaing being "the fork".
 */

describe("Contract Deployed on Main Chain After Fork", function() {
  var contract;
  var contractAddress;
  var forkedServer;
  var mainAccounts;
  var forkedAccounts;

  var forkedWeb3 = new Web3();
  var mainWeb3 = new Web3();

  var forkedTargetUrl = "ws://localhost:21345";
  var forkBlockNumber;

  var initialDeployTransactionHash;

  before("set up test data", function() {
    this.timeout(10000)
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

  before("Initialize Fallback Ganache server", function(done) {
    this.timeout(10000)
    forkedServer = Ganache.server({
      // Do not change seed. Determinism matters for these tests.
      seed: "let's make this deterministic",
      ws: true,
      logger: logger
    });

    forkedServer.listen(21345, function(err) {
      if (err) return done(err);
      done();
    });
  });

  before("set forkedWeb3 provider", function(done) {
    forkedWeb3.setProvider(new Web3WsProvider(forkedTargetUrl));
    done();
  });

  before("Gather forked accounts", function(done) {
    this.timeout(5000)
    forkedWeb3.eth.getAccounts(function(err, f) {
      if (err) return done(err);
      forkedAccounts = f;
      done();
    });
  });

  before("Set main web3 provider, forking from forked chain at this point", function(done) {
    mainWeb3.setProvider(Ganache.provider({
      fork: forkedTargetUrl.replace('ws', 'http'),
      logger,
      verbose: true,

      // Do not change seed. Determinism matters for these tests.
      seed: "a different seed"
    }));

    forkedWeb3.eth.getBlockNumber(function(err, number) {
      if (err) return done(err);
      forkBlockNumber = number;
      done();
    });
  });

  before("Gather main accounts", function(done) {
    this.timeout(5000)
    mainWeb3.eth.getAccounts(function(err, m) {
      if (err) return done(err);
      mainAccounts = m;
      done();
    });
  });

  before("Deploy initial contract", function(done) {
    mainWeb3.eth.sendTransaction({
      from: mainAccounts[0],
      data: contract.binary,
      gas: 3141592,
      value: mainWeb3.utils.toWei('1', 'ether')
    }, function(err, tx) {
      if (err) { return done(err); }

      // Save this for a later test.
      initialDeployTransactionHash = tx;

      mainWeb3.eth.getTransactionReceipt(tx, function(err, receipt) {
        if (err) return done(err);

        contractAddress = receipt.contractAddress;

        mainWeb3.eth.getCode(contractAddress, function(err, code) {
          if (err) return done(err);

          // Ensure there's *something* there.
          assert.notEqual(code, null);
          assert.notEqual(code, "0x");
          assert.notEqual(code, "0x0");

          done();
        })
      });
    });
  });

  it("should send 1 ether to the created contract, checked on the forked chain", function(done) {
    mainWeb3.eth.getBalance(contractAddress, function(err, balance) {
      if (err) return done(err);

      assert.equal(balance, mainWeb3.utils.toWei('1', 'ether'));
      done();
    })
  });

  after("Shutdown server", function(done) {
    forkedWeb3._provider.connection.close()
    forkedServer.close(function(serverCloseErr) {
      forkedWeb3.setProvider();
      let mainProvider = mainWeb3._provider;
      mainWeb3.setProvider();
      mainProvider.close(function(providerCloseErr) {
        if (serverCloseErr) return done(serverCloseErr);
        if (providerCloseErr) return done(providerCloseErr);
        done()
      });
    });
  });
});
