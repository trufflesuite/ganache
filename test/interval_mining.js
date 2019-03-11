const BN = require("bn.js");
const Web3 = require("web3");
const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const assert = require("assert");
const solc = require("solc");
const sleep = require("./helpers/utils/sleep");
const initializeTestProvider = require("./helpers/web3/initializeTestProvider");

describe("Interval Mining", function() {
  let web3;

  const mnemonic = "into trim cross then helmet popular suit hammer cart shrug oval student";
  const firstAddress = "0x604a95C9165Bc95aE016a5299dd7d400dDDBEa9A";

  it("should mine a block on the interval", async function() {
    this.timeout(5000);

    const { web3 } = await initializeTestProvider({
      blockTime: 0.5, // seconds
      mnemonic
    });

    // Get the first block (pre-condition)
    const blockNumber = await web3.eth.getBlockNumber();
    assert.strictEqual(blockNumber, 0);

    // Wait 1.25 seconds (two and a half mining intervals) then get the next block.
    // It should be block number 2 (the third block). We wait more than one iteration
    // to ensure the timeout gets reset.
    await sleep(1250);

    const latestNumber = await web3.eth.getBlockNumber();
    assert.strictEqual(latestNumber, 2);
  });

  it("shouldn't instamine when mining on an interval", function(done) {
    this.timeout(5000);

    web3 = new Web3(
      Ganache.provider({
        blockTime: 0.25, // seconds
        mnemonic: mnemonic
      })
    );

    // Get the first block (pre-condition)
    web3.eth.getBlockNumber(function(err, number) {
      if (err) {
        return done(err);
      }
      assert.strictEqual(number, 0);

      // Queue a transaction
      web3.eth.sendTransaction(
        {
          from: firstAddress,
          to: "0x1234567890123456789012345678901234567890",
          value: web3.utils.toWei(new BN(1), "ether"),
          gas: 90000
        },
        function(err, tx) {
          if (err) {
            return done(err);
          }

          // Ensure there's no receipt since the transaction hasn't yet been processed.
          web3.eth.getTransactionReceipt(tx, function(err, receipt) {
            if (err) {
              return done(err);
            }

            assert.strictEqual(receipt, null);

            // Wait .75 seconds (one and a half mining intervals) then get the receipt. It should be processed.

            setTimeout(function() {
              // Get the first block (pre-condition)
              web3.eth.getTransactionReceipt(tx, function(err, newReceipt) {
                if (err) {
                  return done(err);
                }

                assert.notStrictEqual(newReceipt, null);
                done();
              });
            }, 750);
          });
        }
      );
    });
  });

  it("miner_stop should stop interval mining, and miner_start should start it again", function(done) {
    this.timeout(5000);

    web3 = new Web3(
      Ganache.provider({
        blockTime: 0.5, // seconds
        mnemonic: mnemonic
      })
    );

    // Stop mining
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "miner_stop",
        id: new Date().getTime()
      },
      function(err, result) {
        if (err) {
          return done(err);
        }
        if (result.error) {
          return done(result.error.message);
        }

        // Get the first block (pre-condition)
        web3.eth.getBlockNumber(function(err, initialNumber) {
          if (err) {
            return done(err);
          }

          // Wait .75 seconds (one and a half mining intervals) and ensure
          // the block number hasn't increased.
          setTimeout(function() {
            web3.eth.getBlockNumber(function(err, stoppedNumber) {
              if (err) {
                return done(err);
              }
              assert.strictEqual(stoppedNumber, initialNumber);

              // Start mining again
              web3.currentProvider.send(
                {
                  jsonrpc: "2.0",
                  method: "miner_start",
                  params: [1],
                  id: new Date().getTime()
                },
                function(err, result) {
                  if (err) {
                    return done(err);
                  }
                  if (result.error) {
                    return done(result.error.message);
                  }

                  // Wait .75 seconds (one and a half mining intervals) and ensure
                  // the block number has increased by one.
                  setTimeout(function() {
                    web3.eth.getBlockNumber(function(err, lastNumber) {
                      if (err) {
                        return done(err);
                      }

                      assert(lastNumber > stoppedNumber);
                      done();
                    });
                  }, 750);
                }
              );
            });
          }, 750);
        });
      }
    );
  });

  it("should log runtime errors to the log", async function() {
    this.timeout(5000);

    let logData = "";
    const logger = {
      log: function(message) {
        logData += message + "\n";
      }
    };

    web3 = new Web3(
      Ganache.provider({
        blockTime: 0.5, // seconds
        mnemonic: mnemonic,
        logger: logger
      })
    );

    const result = solc.compile(
      { sources: { "Example.sol": "pragma solidity ^0.4.2; contract Example { function Example() {throw;} }" } },
      1
    );
    const bytecode = "0x" + result.contracts["Example.sol:Example"].bytecode;

    try {
      await web3.eth.sendTransaction({
        from: firstAddress,
        data: bytecode,
        gas: 3141592
      });
      assert.fail("Contract deploy promise should have rejected");
    } catch (e) {
      assert(logData.indexOf("Runtime Error: revert") >= 0);
    }
  });
});
