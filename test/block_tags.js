var Web3 = require('web3');
var utils = require('ethereumjs-util');
var assert = require('assert');
var Ganache = require("../index.js");
var fs = require("fs");
var solc = require("solc");
var async = require("async");
var to = require("../lib/utils/to.js");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

var logger = {
  log: function(msg) { /*noop*/ }
};

var source = fs.readFileSync("./test/Example.sol", {encoding: "utf8"});
var result = solc.compile(source, 1);

// Note: Certain properties of the following contract data are hardcoded to
// maintain repeatable tests. If you significantly change the solidity code,
// make sure to update the resulting contract data with the correct values.
var contract = {
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

describe("Block Tags", function() {
  var accounts;
  var web3 = new Web3(Ganache.provider());
  var contractAddress;

  var initial_block_number;
  var initial = {};

  before("Gather accounts", function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  before("Get initial block number", function(done) {
    web3.eth.getBlockNumber(function(err, n) {
      if (err) return done(err);
      initial_block_number = to.number(n);
      done();
    });
  });

  before("Get initial balance and nonce", function(done) {
    async.parallel({
      balance: web3.eth.getBalance.bind(web3.eth, accounts[0]),
      nonce: web3.eth.getTransactionCount.bind(web3.eth, accounts[0])
    }, function(err, result) {
      if (err) return done(err);
      initial = result;
      initial.nonce = to.number(initial.nonce);
      done();
    });
  });

  before("Make transaction that changes balance, nonce and code", function(done) {
    web3.eth.sendTransaction({
      from: accounts[0],
      data: contract.binary,
      gas: 3141592
    }, function(err, tx) {
      if (err) return done(err);

      web3.eth.getTransactionReceipt(tx, function(err, receipt) {
        if (err) return done(err);

        contractAddress = receipt.contractAddress;
        done();
      });
    });
  });

  it("should return the initial nonce at the previous block number", function(done) {
    web3.eth.getTransactionCount(accounts[0], initial_block_number, function(err, nonce) {
      if (err) return done(err);
      assert.equal(nonce, initial.nonce);

      // Check that the nonce incremented with the block number, just to be sure.
      web3.eth.getTransactionCount(accounts[0], initial_block_number + 1, function(err, nonce) {
        if (err) return done(err);
        assert.equal(nonce, initial.nonce + 1);
        done();
      });
    });
  });

  it("should return the initial balance at the previous block number", function(done) {
    web3.eth.getBalance(accounts[0], initial_block_number, function(err, balance) {
      if (err) return done(err);
      assert.equal(balance, initial.balance);

      // Check that the balance incremented with the block number, just to be sure.
      web3.eth.getBalance(accounts[0], initial_block_number + 1, function(err, balance) {
        if (err) return done(err);
        var initialBalanceInEther = parseFloat(web3.utils.fromWei(initial.balance, 'ether'));
        var balanceInEther = parseFloat(web3.utils.fromWei(balance, 'ether'));
        assert(balanceInEther < initialBalanceInEther);
        done();
      });
    });
  });

  it("should return the no code at the previous block number", function(done) {
    web3.eth.getCode(contractAddress, initial_block_number, function(err, code) {
      if (err) return done(err);
      assert.equal(code, "0x0");

      // Check that the code incremented with the block number, just to be sure.
      web3.eth.getCode(contractAddress, initial_block_number + 1, function(err, code) {
        if (err) return done(err);
        assert.notEqual(code, "0x0");
        assert(code.length > 20); // Just because we don't know the actual code we're supposed to get back
        done();
      });
    });
  });
});
