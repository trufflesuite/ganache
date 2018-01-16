var BN = require("bn.js");
var Ganache = require("../");
var async = require("async");
var Web3 = require("web3");
var assert = require("assert");

describe("Checkpointing / Reverting", function() {
  var provider;
  var accounts;
  var web3 = new Web3();
  var startingBalance;
  var snapshotId;

  before("create provider", function() {
    provider = Ganache.provider();
    web3.setProvider(provider);
  });

  before("get accounts", function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  before("send a transaction then make a checkpoint", function(done) {
    web3.eth.sendTransaction({
      from: accounts[0],
      to: accounts[1],
      value: web3.utils.toWei(new BN(1), "ether"),
      gas: 90000
    }, function() {
      // Since transactions happen immediately, we can assert the balance.
      web3.eth.getBalance(accounts[0], function(err, balance) {
        if (err) return done(err);

        balance = parseFloat(web3.utils.fromWei(balance, "ether"))

        // Assert the starting balance is where we think it is, including tx costs.
        assert(balance > 98.9 && balance < 99);

        startingBalance = balance;

        // Now checkpoint.
        provider.send({
          jsonrpc: "2.0",
          method: "evm_snapshot",
          params: [],
          id: new Date().getTime()
        }, function(err, result) {
          if (err) return done(err);
          snapshotId = result.result;
          done();
        });
      })
    });
  });

  it("rolls back successfully", function(done) {
    // Send another transaction, check the balance, then roll it back to the old one and check the balance again.
    web3.eth.sendTransaction({
      from: accounts[0],
      to: accounts[1],
      value: web3.utils.toWei(new BN(1), "ether"),
      gas: 90000
    }, function(err, tx_hash) {
      if (err) return done(err);

      // Since transactions happen immediately, we can assert the balance.
      web3.eth.getBalance(accounts[0], function(err, balance) {
        if (err) return done(err);

        balance = parseFloat(web3.utils.fromWei(balance, "ether"))

        // Assert the starting balance is where we think it is, including tx costs.
        assert(balance > 97.9 && balance < 98);

        // Now revert.
        provider.send({
          jsonrpc: "2.0",
          method: "evm_revert",
          params: [snapshotId],
          id: new Date().getTime()
        }, function(err, result) {
          if (err) return done(err);
          assert(result, "Snapshot should have returned true");

          // Now check the balance one more time.
          web3.eth.getBalance(accounts[0], function(err, balance) {
            if (err) return done(err);

            balance = parseFloat(web3.utils.fromWei(balance, "ether"))

            assert(balance == startingBalance, "Should have reverted back to the starting balance");

            // Now check that the receipt is gone.
            web3.eth.getTransactionReceipt(tx_hash, function(err, receipt) {
              if (err) return done(err);

              assert.equal(receipt, null, "Receipt should be null as it should have been removed");

              done();
            });
          });
        });
      })
    });
  })
});
