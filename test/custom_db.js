var assert = require('assert');
var memdown = require('memdown');
var Web3 = require('web3');
var TestRPC = require("../index.js");

describe("DB can be customized", function() {
  describe("Persistence", function() {
    var db = memdown();
    var web3 = new Web3();
    var provider;
    var accounts;
    var tx_hash;

    // initialize a memory-persistent provider
    before('init provider', function (done) {
      provider = TestRPC.provider({
        db,
        mnemonic: "debris electric learn dove warrior grow pistol carry either curve radio hidden"
      });
      web3.setProvider(provider);
      done();
    });

    before("Gather accounts", function(done) {
      web3.eth.getAccounts(function(err, a) {
        if (err) return done(err);
        accounts = a;
        done();
      });
    });

    before("send transaction", function (done) {
      web3.eth.sendTransaction({
        from: accounts[0],
        gas: '0x2fefd8',
        data: contract.binary
      }, function(err, hash) {
        if (err) return done(err);
        tx_hash = hash;
        done();
      });
    });

    it("should have block height 1", function (done) {
      this.timeout(5000);
      web3.eth.getBlockNumber(function(err, res) {
        if (err) return done(err);

        assert(res == 1);

        // Close the first provider now that we've gotten where we need to be.
        // Note: we specifically close the provider so we can read from the same db.
        provider.close(done);
      });
    });

    it("should reopen the provider", function (done) {
      provider = TestRPC.provider({
        db,
        mnemonic: "debris electric learn dove warrior grow pistol carry either curve radio hidden"
        // logger: console,
        // verbose: true
      });
      web3.setProvider(provider);
      done();
    });

    it("should still be on block height 1", function (done) {
      this.timeout(5000);
      web3.eth.getBlockNumber(function(err, result) {
        if (err) return done(err);
        assert(result == 1);
        done();
      });
    });

    it("should still have block data for first block", function (done) {
      web3.eth.getBlock(1, function(err, result) {
        if (err) return done(err);
        done();
      });
    });

    it("should have a receipt for the previous transaction", function(done) {
      web3.eth.getTransactionReceipt(tx_hash, function(err, receipt) {
        if (err) return done(err);

        assert.notEqual(receipt, null, "Receipt shouldn't be null!");
        assert.equal(receipt.transactionHash, tx_hash);
        done();
      })
    });

    it("should maintain the balance of the original accounts", function (done) {
      web3.eth.getBalance(accounts[0], function(err, balance) {
        if (err) return done(err);
        assert(balance.toNumber() > 98);
        done();
      });
    });
  });
});
