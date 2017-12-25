var Web3 = require('web3');
var assert = require('assert');
var TestRPC = require("../index.js");
var utils = require('ethereumjs-util');

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

describe("race conditions", function(done) {
  var web3 = new Web3();
  var provider;
  var accounts;

  before("initialize the provider", function() {
    provider = TestRPC.provider();
    web3.setProvider(provider);
  });

  before("get accounts", function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);

      accounts = accs;
      done();
    });
  });

  it("should not cause 'get' of undefined", function(done) {
    process.prependOnceListener('uncaughtException', function(err) {
      done(err);
    });

    var waitUntilReady = setInterval(function() {
      var trie = provider.manager.state.blockchain.stateTrie;
      if (trie) {
        clearInterval(waitUntilReady);
        var blockchain = provider.manager.state.blockchain;
        blockchain.vm.stateManager.checkpoint(); // processCall or processBlock
        blockchain.stateTrie.get(utils.toBuffer(accounts[0]), function() {}); // getCode (or any function that calls trie.get)
        blockchain.vm.stateManager.revert(function() {}); // processCall or processBlock
      }
    }, 1);
  });

  it("should not cause 'pop' of undefined", function(done) {
    process.prependOnceListener('uncaughtException', function(err) {
      done(err);
    });

    var waitUntilReady = setInterval(function() {
      var trie = provider.manager.state.blockchain.stateTrie;
      if (trie) {
        clearInterval(waitUntilReady);
        var blockchain = provider.manager.state.blockchain;
        blockchain.vm.stateManager.checkpoint(); // processCall #1
        // processNextBlock triggered by interval mining which at some point calls vm.stateManager.commit() and blockchain.putBlock()
        blockchain.processNextBlock(function(err, tx, results) {
          blockchain.vm.stateManager.revert(function() { // processCall #1 finishes
            blockchain.latestBlock(function (err, latestBlock) { // getCode #1 (or any function with this logic)
              blockchain.stateTrie.root = latestBlock.header.stateRoot;
              // processCall #2
              var call_data = {
                gasPrice: '0x01',
                to: accounts[1],
                data: '0x3fa4f245',
                from: accounts[0]
              };
              web3.eth.call(call_data, function() {
                done();
              });
            });
          });
        });
      }
    }, 1);
  });
});
