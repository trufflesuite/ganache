var BN = require("bn.js");
var Web3 = require("web3");
var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
var assert = require("assert");

describe("Accounts", function() {
  var expectedAddress = "0x604a95C9165Bc95aE016a5299dd7d400dDDBEa9A";
  var mnemonic = "into trim cross then helmet popular suit hammer cart shrug oval student";

  it("should respect the BIP99 mnemonic", function(done) {
    var web3 = new Web3();
    web3.setProvider(
      Ganache.provider({
        mnemonic: mnemonic
      })
    );

    web3.eth.getAccounts(function(err, accounts) {
      if (err) {
        return done(err);
      }

      assert(accounts[0].toLowerCase(), expectedAddress.toLowerCase());
      done();
    });
  });

  it("should lock all accounts when specified", function(done) {
    var web3 = new Web3();
    web3.setProvider(
      Ganache.provider({
        mnemonic: mnemonic,
        secure: true
      })
    );

    web3.eth.sendTransaction(
      {
        from: expectedAddress,
        to: "0x1234567890123456789012345678901234567890", // doesn't need to exist
        value: web3.utils.toWei(new BN(1), "ether"),
        gasLimit: 90000
      },
      function(err) {
        if (!err) {
          return done(
            new Error("We expected the account to be locked, which should throw an error when sending a transaction")
          );
        }
        assert.strictEqual(err.message, "signer account is locked");
        done();
      }
    );
  });

  it("should unlock specified accounts, in conjunction with --secure", function(done) {
    var web3 = new Web3();
    web3.setProvider(
      Ganache.provider({
        mnemonic: mnemonic,
        secure: true,
        unlocked_accounts: [expectedAddress]
      })
    );

    web3.eth.sendTransaction(
      {
        from: expectedAddress,
        to: "0x1234567890123456789012345678901234567890", // doesn't need to exist
        value: web3.utils.toWei(new BN(1), "ether"),
        gasLimit: 90000
      },
      function(err, tx) {
        if (err) {
          return done(err);
        }
        // We should have no error here because the account is unlocked.
        done();
      }
    );
  });

  it("should unlock specified accounts, in conjunction with --secure, using array indexes", function(done) {
    var web3 = new Web3();
    web3.setProvider(
      Ganache.provider({
        mnemonic: mnemonic,
        secure: true,
        unlocked_accounts: [0]
      })
    );

    web3.eth.sendTransaction(
      {
        from: expectedAddress,
        to: "0x1234567890123456789012345678901234567890", // doesn't need to exist
        value: web3.utils.toWei(new BN(1), "ether"),
        gasLimit: 90000
      },
      function(err, tx) {
        if (err) {
          return done(err);
        }
        // We should have no error here because the account is unlocked.
        done();
      }
    );
  });

  it("should unlock accounts even if private key isn't managed by the testrpc (impersonation)", function() {
    var secondAddress = "0x1234567890123456789012345678901234567890";

    var web3 = new Web3();
    web3.setProvider(
      Ganache.provider({
        mnemonic: mnemonic,
        secure: true,
        unlocked_accounts: [0, secondAddress]
      })
    );

    // Set up: give second address some ether
    return web3.eth
      .sendTransaction({
        from: expectedAddress,
        to: secondAddress,
        value: web3.utils.toWei(new BN(10), "ether"),
        gasLimit: 90000
      })
      .then(() => {
        // Now we should be able to send a transaction from second address without issue.
        return web3.eth.sendTransaction({
          from: secondAddress,
          to: expectedAddress,
          value: web3.utils.toWei(new BN(5), "ether"),
          gasLimit: 90000
        });
      })
      .then((tx) => {
        // And for the heck of it let's check the balance just to make sure it went through
        return web3.eth.getBalance(secondAddress);
      })
      .then((balance) => {
        var balanceInEther = web3.utils.fromWei(new BN(balance), "ether");

        if (typeof balanceInEther === "string") {
          balanceInEther = parseFloat(balanceInEther);
        } else {
          balanceInEther.toNumber();
        }

        // Can't check the balance exactly. It cost some ether to send the transaction.
        assert(balanceInEther > 4);
        assert(balanceInEther < 5);
      });
  });

  it("errors when we try to sign a transaction from an account we're impersonating", function() {
    var secondAddress = "0x1234567890123456789012345678901234567890";

    var web3 = new Web3();
    web3.setProvider(
      Ganache.provider({
        mnemonic: mnemonic,
        secure: true,
        unlocked_accounts: [0, secondAddress]
      })
    );

    return web3.eth
      .sign("some data", secondAddress)
      .then((result) => {
        assert.fail("Expected an error while signing when not managing the private key");
      })
      .catch((err) => {
        assert(err.message.toLowerCase().indexOf("cannot sign data; no private key") >= 0);
      });
  });

  it("should create a 2 accounts when passing an object to provider", function(done) {
    var web3 = new Web3();
    web3.setProvider(
      Ganache.provider({
        accounts: [{ balance: "0x12" }, { balance: "0x13" }]
      })
    );

    web3.eth.getAccounts(function(err, result) {
      if (err) {
        return done(err);
      }
      assert(result.length, 2, "The number of accounts created should be 2");
      done();
    });
  });

  it("should create a 7 accounts when ", function(done) {
    var web3 = new Web3();
    web3.setProvider(
      Ganache.provider({
        total_accounts: 7
      })
    );

    web3.eth.getAccounts(function(err, result) {
      if (err) {
        return done(err);
      }
      assert(result.length, 7, "The number of accounts created should be 7");
      done();
    });
  });

  it("should respect the default_balance_ether option", function(done) {
    var web3 = new Web3();
    web3.setProvider(
      Ganache.provider({
        default_balance_ether: 1.23456
      })
    );

    web3.eth.getAccounts(function(err, accounts) {
      if (err) {
        return done(err);
      }

      function checkBalance(account) {
        return new Promise(function(resolve, reject) {
          web3.eth.getBalance(accounts[0], function(err, balance) {
            if (err) {
              return reject(err);
            }

            var balanceInEther = web3.utils.fromWei(balance, "Ether");

            assert.strictEqual(balanceInEther, "1.23456");
            return resolve(balance);
          });
        });
      }

      accounts.reduce((promise, account, index) => {
        var returnVal;

        if (promise) {
          returnVal = promise.then(checkBalance(account));
        } else {
          returnVal = checkBalance(account);
        }

        if (index === accounts.length - 1) {
          returnVal.then(done()).catch((err) => {
            done(err);
          });
        }

        return returnVal;
      }, null);
    });
  });
});
