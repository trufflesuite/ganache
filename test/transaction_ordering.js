var Web3 = require('web3');
var Ganache = require("../index.js");
var assert = require('assert');
var to = require('../lib/utils/to.js');

describe("Transaction Ordering", function() {
  var accounts;
  var web3 = new Web3(Ganache.provider());

  before(function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);

      accounts = accs;
      done();
    });
  });

  beforeEach(function(done){
    web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "miner_stop",
    }, done)
  });

  afterEach(function(done){
    web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "miner_start",
      params: [1]
    }, done)
  });

  it("should order queued transactions correctly by nonce before adding to the block", function(done) {
    var tx_data = {}
    tx_data.to = accounts[1];
    tx_data.from = accounts[0];
    tx_data.value = 0x1;
    tx_data.nonce = 0;
    tx_data.gas = 21000;
    web3.eth.sendTransaction(tx_data, function(err, tx) {
      if (err){return done(err)}
      tx_data.nonce=1;
      web3.eth.sendTransaction(tx_data, function(err, tx){
        if (err){return done(err)}
        web3.currentProvider.send({
          jsonrpc: "2.0",
          method: "miner_start",
          params: [1]
        }, function(err,tx){
          web3.eth.getBlock("latest", function(err, block) {
            if (err) return done(err);
            assert.equal(block.transactions.length, 2, "Latest block should have two transactions");
            done();
          });
        })
      })
    })
  });

  it("should order queued transactions correctly by price before adding to the block", function(done) {
    var tx_data = {}
    tx_data.to = accounts[1];
    tx_data.from = accounts[0];
    tx_data.value = 0x1;
    tx_data.gas = 21000;
    tx_data.gasPrice = 0x1
    web3.eth.sendTransaction(tx_data, function(err, tx) {
      if (err){return done(err)}
      tx_data.gasPrice=2;
      tx_data.from = accounts[1];
      web3.eth.sendTransaction(tx_data, function(err, tx){
        if (err){return done(err)}
        web3.currentProvider.send({
          jsonrpc: "2.0",
          method: "miner_start",
          params: [1]
        }, function(err,tx){
          web3.eth.getBlock("latest", true, function(err, block) {
            if (err) return done(err);
            assert.equal(block.transactions.length, 2, "Latest block should have two transactions");
            assert.equal(to.number(block.transactions[0].gasPrice), 2)
            assert.equal(to.number(block.transactions[1].gasPrice), 1)
            done();
          });
        })
      })
    })
  });
});
