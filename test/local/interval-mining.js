const { BN } = require("ethereumjs-util");
const assert = require("assert");
const sleep = require("../helpers/utils/sleep");
const initializeTestProvider = require("../helpers/web3/initializeTestProvider");
const { compile } = require("../helpers/contract/compileAndDeploy");
const generateRandomInteger = require("../helpers/utils/generateRandomInteger");
const seed = generateRandomInteger(1000000);

describe("Interval Mining", function() {
  let firstAddress;

  describe("Interval mining", function() {
    let context;
    before("Setting up provider and web3 instance", async function() {
      context = await initializeTestProvider({
        blockTime: 0.5, // seconds
        seed
      });
      firstAddress = context.accounts[0];
    });

    it("should mine a block on the interval", async function() {
      this.timeout(5000);
      const { web3 } = context;

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
  });

  describe("Instamine vs Interval", function() {
    let context;
    before("Setting up provider and web3 instance", async function() {
      context = await initializeTestProvider({
        blockTime: 0.25, // seconds
        seed
      });
    });

    it("shouldn't instamine when mining on an interval", function(done) {
      this.timeout(5000);
      const { web3 } = context;

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
  });

  describe("miner_start and restart", function() {
    let context;
    before("Setting up provider and web3 instance", async function() {
      context = await initializeTestProvider({
        blockTime: 0.5, // seconds
        seed
      });
    });

    it("miner_stop should stop interval mining, and miner_start should start it again", function(done) {
      this.timeout(5000);
      const { provider, web3 } = context;

      // Stop mining
      provider.send(
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
                provider.send(
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
  });

  describe("Logging errors", function() {
    let context;
    let logData = "";

    before("Setting up provider and web3 instance", async function() {
      const logger = {
        log: function(message) {
          logData += message + "\n";
        }
      };

      context = await initializeTestProvider({
        blockTime: 0.5, // seconds
        seed,
        logger
      });
    });

    before("Compile contract", async function() {
      this.timeout(10000);
      const contractFilename = "Example2";
      const subcontractFiles = [];
      const contractSubdirectory = "examples";
      const { bytecode } = await compile(contractFilename, subcontractFiles, contractSubdirectory);

      context.bytecode = bytecode;
    });

    it("should log runtime errors to the log", async function() {
      this.timeout(5000);
      const { bytecode, web3 } = context;

      await assert.rejects(
        web3.eth.sendTransaction({ from: firstAddress, data: bytecode, gas: 3141592 }),
        /The contract code couldn't be stored, please check your gas limit/
      );

      assert(logData.indexOf("Runtime Error: revert") >= 0);
    });
  });
});
