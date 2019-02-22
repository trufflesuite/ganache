var BN = require("bn.js");
var Ganache = require("../");
var Web3 = require("web3");
var assert = require("assert");
const bootstrap = require("./helpers/contract/bootstrap");
const send = require("./helpers/utils/rpc");

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
      if (err) {
        return done(err);
      }
      accounts = accs;
      done();
    });
  });

  before("send a transaction then make a checkpoint", function(done) {
    web3.eth.sendTransaction(
      {
        from: accounts[0],
        to: accounts[1],
        value: web3.utils.toWei(new BN(1), "ether"),
        gas: 90000
      },
      function() {
        // Since transactions happen immediately, we can assert the balance.
        web3.eth.getBalance(accounts[0], function(err, balance) {
          if (err) {
            return done(err);
          }

          balance = parseFloat(web3.utils.fromWei(balance, "ether"));

          // Assert the starting balance is where we think it is, including tx costs.
          assert(balance > 98.9 && balance < 99);

          startingBalance = balance;

          // Now checkpoint.
          provider.send(
            {
              jsonrpc: "2.0",
              method: "evm_snapshot",
              params: [],
              id: new Date().getTime()
            },
            function(err, result) {
              if (err) {
                return done(err);
              }
              snapshotId = result.result;
              done();
            }
          );
        });
      }
    );
  });

  it("rolls back successfully", function(done) {
    // Send another transaction, check the balance, then roll it back to the old one and check the balance again.
    web3.eth.sendTransaction(
      {
        from: accounts[0],
        to: accounts[1],
        value: web3.utils.toWei(new BN(1), "ether"),
        gas: 90000
      },
      function(err, txHash) {
        if (err) {
          return done(err);
        }

        // Since transactions happen immediately, we can assert the balance.
        web3.eth.getBalance(accounts[0], function(err, balance) {
          if (err) {
            return done(err);
          }

          balance = parseFloat(web3.utils.fromWei(balance, "ether"));

          // Assert the starting balance is where we think it is, including tx costs.
          assert(balance > 97.9 && balance < 98);

          // Now revert.
          provider.send(
            {
              jsonrpc: "2.0",
              method: "evm_revert",
              params: [snapshotId],
              id: new Date().getTime()
            },
            function(err, result) {
              if (err) {
                return done(err);
              }
              assert(result, "Snapshot should have returned true");

              // Now check the balance one more time.
              web3.eth.getBalance(accounts[0], function(err, balance) {
                if (err) {
                  return done(err);
                }

                balance = parseFloat(web3.utils.fromWei(balance, "ether"));

                assert(balance === startingBalance, "Should have reverted back to the starting balance");

                // Now check that the receipt is gone.
                web3.eth.getTransactionReceipt(txHash, function(err, receipt) {
                  if (err) {
                    return done(err);
                  }

                  assert.strictEqual(receipt, null, "Receipt should be null as it should have been removed");

                  done();
                });
              });
            }
          );
        });
      }
    );
  });

  it("checkpoints and reverts without persisting contract storage", async() => {
    const contractRef = {
      contractFiles: ["snapshot"],
      contractSubdirectory: "snapshotting"
    };

    const ganacheProviderOptions = {};

    const context = await bootstrap(contractRef, ganacheProviderOptions);
    const { accounts, instance, provider } = context;
    const mySend = send(provider);

    const snapShotId = await mySend("evm_snapshot");
    let n1 = await instance.methods.n().call();
    assert.strictEqual(n1, "42", "Initial n is not 42");

    await instance.methods.inc().send({ from: accounts[0] });
    let n2 = await instance.methods.n().call();
    assert.strictEqual(n2, "43", "n is not 43 after first call to `inc`");

    await mySend("evm_revert", snapShotId.result);
    let n3 = await instance.methods.n().call();
    assert.strictEqual(n3, "42", "n is not 42 after reverting snapshot");

    // this is the real test. what happened was that the vm's contract storage
    // trie cache wasn't cleared when the vm's stateManager cache was cleared.
    await instance.methods.inc().send({ from: accounts[0] });
    let n4 = await instance.methods.n().call();
    assert.strictEqual(n4, "43", "n is not 43 after calling `inc` again");
  });
});
