var Web3 = require('web3');
var assert = require('assert');
var TestRPC = require("../index.js");

var logger = {
  log: function(message) {
    //console.log(message);
  }
};

describe("TestRPC", function(done) {
  var web3 = new Web3();
  var provider;
  var port = 12345;
  var server;
  var accounts;

  before("Initialize the provider", function() {
    provider = TestRPC.provider();
    web3.setProvider(provider);
  });

  before(function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);

      accounts = accs;
      done();
    });
  });

  it("should be able to handle multiple transactions at once and manage nonces accordingly", function(done) {
    var expected = 5;
    var received = 0;
    var callback_called = false;

    var txHandler = function(err, result) {
      if (callback_called) {
        return;
      }

      received += 1;

      if (err || received >= expected) {
        callback_called = true;
        return done(err);
      }
    };

    // Fire off transaction at once
    for (var i = 0; i < expected; i++) {
      web3.eth.sendTransaction({
        from: accounts[0],
        to: accounts[1],
        value: web3.toWei(1, "ether")
      }, txHandler);
    }
  });

  it("should be able to handle batch transactions", function() {
    var expected = 5;
    var received = 0;
    var callback_called = false;

    var txHandler = function(err, result) {
      if (callback_called) {
        return;
      }

      received += 1;

      if (err || received >= expected) {
        callback_called = true;
        return done(err);
      }
    };

    var batch = web3.createBatch();

    for (var i = 0; i < expected; i++) {
      batch.add(web3.eth.sendTransaction.request({
        from: accounts[0],
        to: accounts[1],
        value: web3.toWei(1, "ether")
      }), txHandler);
    }

    batch.execute();
  });
});
