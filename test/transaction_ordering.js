var Web3 = require("web3");
var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
var assert = require("assert");
var to = require("../lib/utils/to.js");

describe("Transaction Ordering", function() {
  var accounts;
  var web3 = new Web3(Ganache.provider());

  before(function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) {
        return done(err);
      }

      accounts = accs;
      done();
    });
  });

  beforeEach(function(done) {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "miner_stop"
      },
      done
    );
  });

  afterEach(function(done) {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "miner_start",
        params: [1]
      },
      done
    );
  });

  it("should order queued transactions correctly by nonce before adding to the block", function(done) {
    var txData = {};
    txData.to = accounts[1];
    txData.from = accounts[0];
    txData.value = 0x1;
    txData.nonce = 0;
    txData.gas = 21000;
    web3.eth.sendTransaction(txData, function(err, tx) {
      if (err) {
        return done(err);
      }
      txData.nonce = 1;
      web3.eth.sendTransaction(txData, function(err, tx) {
        if (err) {
          return done(err);
        }
        web3.currentProvider.send(
          {
            jsonrpc: "2.0",
            method: "miner_start",
            params: [1]
          },
          function(err, tx) {
            if (err) {
              return done(err);
            }
            web3.eth.getBlock("latest", function(err, block) {
              if (err) {
                return done(err);
              }
              assert.strictEqual(block.transactions.length, 2, "Latest block should have two transactions");
              done();
            });
          }
        );
      });
    });
  });

  it("should order queued transactions correctly by price before adding to the block", function(done) {
    var txData = {};
    txData.to = accounts[1];
    txData.from = accounts[0];
    txData.value = 0x1;
    txData.gas = 21000;
    txData.gasPrice = 0x1;
    web3.eth.sendTransaction(txData, function(err, tx) {
      if (err) {
        return done(err);
      }
      txData.gasPrice = 2;
      txData.from = accounts[1];
      web3.eth.sendTransaction(txData, function(err, tx) {
        if (err) {
          return done(err);
        }
        web3.currentProvider.send(
          {
            jsonrpc: "2.0",
            method: "miner_start",
            params: [1]
          },
          function(err, tx) {
            if (err) {
              return done(err);
            }
            web3.eth.getBlock("latest", true, function(err, block) {
              if (err) {
                return done(err);
              }
              assert.strictEqual(block.transactions.length, 2, "Latest block should have two transactions");
              assert.strictEqual(to.number(block.transactions[0].gasPrice), 2);
              assert.strictEqual(to.number(block.transactions[1].gasPrice), 1);
              done();
            });
          }
        );
      });
    });
  });
});
