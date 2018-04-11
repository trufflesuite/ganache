var BN = require('bn.js');
var Web3 = require('web3');
var Ganache = require("../index.js");
var assert = require('assert');
var to = require("../lib/utils/to.js");
var solc = require("solc");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Interval Mining", function() {
  var web3;

  var mnemonic = "into trim cross then helmet popular suit hammer cart shrug oval student";
  var first_address = "0x604a95C9165Bc95aE016a5299dd7d400dDDBEa9A";

  it("should mine a block on the interval", function(done) {
    this.timeout(5000);

    web3 = new Web3(Ganache.provider({
      blockTime: 0.5, // seconds
      mnemonic: mnemonic
    }));

    // Get the first block (pre-condition)
    web3.eth.getBlockNumber(function(err, number) {
      if (err) return done(err);
      assert.equal(number, 0);

      // Wait 1.25 seconds (two and a half mining intervals) then get the next block.
      // It should be block number 2 (the third block). We wait more than one iteration
      // to ensure the timeout gets reset.

      setTimeout(function() {
        // Get the first block (pre-condition)
        web3.eth.getBlockNumber(function(err, latest_number) {
          assert.equal(latest_number, 2);
          done();
        });
      }, 1250);
    });
  });

  it("shouldn't instamine when mining on an interval", function(done) {
    this.timeout(5000);

    web3 = new Web3(Ganache.provider({
      blockTime: 0.25, // seconds
      mnemonic: mnemonic
    }));

    // Get the first block (pre-condition)
    web3.eth.getBlockNumber(function(err, number) {
      if (err) return done(err);
      assert.equal(number, 0);

      // Queue a transaction
      web3.eth.sendTransaction({
        from: first_address,
        to: "0x1234567890123456789012345678901234567890",
        value: web3.utils.toWei(new BN(1), "ether"),
        gas: 90000
      }, function(err, tx) {
        if (err) return done(err);

        // Ensure there's no receipt since the transaction hasn't yet been processed.
        web3.eth.getTransactionReceipt(tx, function(err, receipt) {
          if (err) return done(err);

          assert.equal(receipt, null);

          // Wait .75 seconds (one and a half mining intervals) then get the receipt. It should be processed.

          setTimeout(function() {
            // Get the first block (pre-condition)
            web3.eth.getTransactionReceipt(tx, function(err, new_receipt) {
              assert.notEqual(new_receipt, null);
              done();
            });
          }, 750);
        });

      });
    });
  });

  it("miner_stop should stop interval mining, and miner_start should start it again", function(done) {
    this.timeout(5000);

    web3 = new Web3(Ganache.provider({
      blockTime: 0.5, // seconds
      mnemonic: mnemonic
    }));

    // Stop mining
    web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "miner_stop",
      id: new Date().getTime()
    }, function(err, result) {
      if (err) return done(err);
      if (result.error) return done(result.error.message);

      // Get the first block (pre-condition)
      web3.eth.getBlockNumber(function(err, initial_number) {
        if (err) return done(err);

        // Wait .75 seconds (one and a half mining intervals) and ensure
        // the block number hasn't increased.
        setTimeout(function() {
          web3.eth.getBlockNumber(function(err, stopped_number) {
            if (err) return done(err);
            assert.equal(stopped_number, initial_number);

            // Start mining again
            web3.currentProvider.send({
              jsonrpc: "2.0",
              method: "miner_start",
              params: [1],
              id: new Date().getTime()
            }, function(err, result) {
              if (err) return done(err);
              if (result.error) return done(result.error.message);

              // Wait .75 seconds (one and a half mining intervals) and ensure
              // the block number has increased by one.
              setTimeout(function() {
                web3.eth.getBlockNumber(function(err, last_number) {
                  if (err) return done(err);

                  assert(last_number > stopped_number);
                  done();
                });
              }, 750)

            });
          });
        }, 750)

      });
    });
  });

  it("should log runtime errors to the log", function(done) {
    this.timeout(5000);

    var logData = "";
    var logger = {
      log: function(message) {
        logData += message + "\n";
      }
    };

    web3 = new Web3(Ganache.provider({
      blockTime: 0.5, // seconds
      mnemonic: mnemonic,
      logger: logger
    }));

    var result = solc.compile({sources: {"Example.sol": "pragma solidity ^0.4.2; contract Example { function Example() {throw;} }"}}, 1);
    var bytecode = "0x" + result.contracts["Example.sol:Example"].bytecode;

    web3.eth.sendTransaction({
      from: first_address,
      data: bytecode,
      gas: 3141592
    }, function(err, tx) {
      if (err) return done(err);

      // Wait .75 seconds (one and a half mining intervals) and ensure log sees error.
      setTimeout(function() {
        assert(logData.indexOf("Runtime Error: revert") >= 0);
        done();
      }, 750);
    });

  });

});
