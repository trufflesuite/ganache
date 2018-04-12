var Web3 = require('web3');
var Ganache = require("../index.js");
var assert = require('assert');
var temp = require("temp").track();
var fs = require("fs");
var solc = require("solc");
var memdown = require("memdown");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

var source = fs.readFileSync("./test/Example.sol", {encoding: "utf8"});
var result = solc.compile(source, 1);
var provider

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

var runTests = function(providerInit) {
  describe("Persistence", function() {
    var web3 = new Web3();
    var accounts;
    var tx_hash;
    var provider;

    before('init provider', function (done) {
      providerInit(function(p) {
        provider = p;
        web3.setProvider(p);
        done();
      });
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
      providerInit(function(p) {
        provider = p;
        web3.setProvider(provider);
        done();
      });
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
        assert(balance > 98);
        done();
      });
    });

  });
}

describe("Default DB", function() {
  // initialize a persistant provider
  temp.mkdir('testrpc-db-', function(err, dirPath) {
    var db_path = dirPath;
    var providerInit = function(cb) {
      provider = Ganache.provider({
        db_path: dirPath,
        mnemonic: "debris electric learn dove warrior grow pistol carry either curve radio hidden"
      });

      cb(provider);
    }
    runTests(providerInit);
  });

});

describe("Custom DB", function() {
  var db = memdown();

  // initialize a custom persistence provider
  var providerInit = function(cb) {
    provider = Ganache.provider({
      db: db,
      mnemonic: "debris electric learn dove warrior grow pistol carry either curve radio hidden"
    });

    cb(provider);
  }

  runTests(providerInit);

});
