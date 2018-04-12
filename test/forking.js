var Web3 = require('web3');
var Web3WsProvider = require('web3-providers-ws');
var utils = require('ethereumjs-util');
var assert = require('assert');
var Ganache = require("../index.js");
var fs = require("fs");
var solc = require("solc");
var to = require("../lib/utils/to.js");
var async = require("async");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

var logger = {
  log: function(msg) { /*console.log(msg)*/ }
};

/**
 * NOTE: Naming in these tests is a bit confusing. Here, the "main chain"
 * is the main chain the tests interact with; and the "forked chain" is the
 * chain that _was forked_. This is in contrast to general naming, where the
 * main chain represents the main chain to be forked (like the Ethereum live
 * network) and the fork chaing being "the fork".
 */

describe("Forking", function() {
  var contract;
  var contractAddress;
  var secondContractAddress; // used sparingly
  var forkedServer;
  var mainAccounts;
  var forkedAccounts;

  var initialFallbackAccountState = {};

  var forkedWeb3 = new Web3();
  var mainWeb3 = new Web3();

  var forkedTargetUrl = "ws://localhost:21345";
  var forkBlockNumber;

  var initialDeployTransactionHash;

  before("set up test data", function() {
    this.timeout(10000)
    var source = fs.readFileSync("./test/Example.sol", {encoding: "utf8"});
    var result = solc.compile(source, 1);

    // Note: Certain properties of the following contract data are hardcoded to
    // maintain repeatable tests. If you significantly change the solidity code,
    // make sure to update the resulting contract data with the correct values.
    contract = {
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
  });

  before("Initialize Fallback Ganache server", function(done) {
    this.timeout(10000)
    forkedServer = Ganache.server({
      // Do not change seed. Determinism matters for these tests.
      seed: "let's make this deterministic",
      ws: true,
      logger: logger
    });

    forkedServer.listen(21345, function(err) {
      if (err) return done(err);
      done();
    });
  });

  before("set forkedWeb3 provider", function(done) {
    forkedWeb3.setProvider(new Web3WsProvider(forkedTargetUrl));
    done();
  });

  before("Gather forked accounts", function(done) {
    this.timeout(5000)
    forkedWeb3.eth.getAccounts(function(err, f) {
      if (err) return done(err);
      forkedAccounts = f;
      done();
    });
  });

  before("Deploy initial contracts", function(done) {
    forkedWeb3.eth.sendTransaction({
      from: forkedAccounts[0],
      data: contract.binary,
      gas: 3141592
    }, function(err, tx) {
      if (err) { return done(err); }

      // Save this for a later test.
      initialDeployTransactionHash = tx;

      forkedWeb3.eth.getTransactionReceipt(tx, function(err, receipt) {
        if (err) return done(err);

        contractAddress = receipt.contractAddress;

        forkedWeb3.eth.getCode(contractAddress, function(err, code) {
          if (err) return done(err);

          // Ensure there's *something* there.
          assert.notEqual(code, null);
          assert.notEqual(code, "0x");
          assert.notEqual(code, "0x0");

          // Deploy a second one, which we won't use often.
          forkedWeb3.eth.sendTransaction({
            from: forkedAccounts[0],
            data: contract.binary,
            gas: 3141592
          }, function(err, tx) {
            if (err) { return done(err); }
            forkedWeb3.eth.getTransactionReceipt(tx, function(err, receipt) {
              if (err) return done(err);

              secondContractAddress = receipt.contractAddress;
              done();
            });
          });
        })
      });
    });
  });

  before("Make a transaction on the forked chain that produces a log", function(done) {
    this.timeout(10000)

    var forkedExample = new forkedWeb3.eth.Contract(JSON.parse(contract.abi), contractAddress);

    // TODO: ugly workaround - not sure why this is necessary.
    if (!forkedExample._requestManager.provider) {
      forkedExample._requestManager.setProvider(forkedWeb3.eth._provider);
    }

    var interval;

    var event = forkedExample.events.ValueSet({});

    event.once('data', function(logs) {
      done()
    });

    forkedExample.methods.setValue(7).send({from: forkedAccounts[0]}, function(err, tx) {
        if (err) return done(err);
    });
  });

  before("Get initial balance and nonce", function(done) {
    async.parallel({
      balance: forkedWeb3.eth.getBalance.bind(forkedWeb3.eth, forkedAccounts[0]),
      nonce: forkedWeb3.eth.getTransactionCount.bind(forkedWeb3.eth, forkedAccounts[0])
    }, function(err, result) {
      if (err) return done(err);
      initialFallbackAccountState = result;
      initialFallbackAccountState.nonce = to.number(initialFallbackAccountState.nonce);
      done();
    });
  });

  before("Set main web3 provider, forking from forked chain at this point", function(done) {
    mainWeb3.setProvider(Ganache.provider({
      fork: forkedTargetUrl.replace('ws', 'http'),
      logger,
      verbose: true,

      // Do not change seed. Determinism matters for these tests.
      seed: "a different seed"
    }));

    forkedWeb3.eth.getBlockNumber(function(err, number) {
      if (err) return done(err);
      forkBlockNumber = number;
      done();
    });
  });

  before("Gather main accounts", function(done) {
    this.timeout(5000)
    mainWeb3.eth.getAccounts(function(err, m) {
      if (err) return done(err);
      mainAccounts = m;
      done();
    });
  });

  it("should fetch a contract from the forked provider via the main provider", function(done) {
    mainWeb3.eth.getCode(contractAddress, function(err, mainCode) {
      if (err) return done(err);

      // Ensure there's *something* there.
      assert.notEqual(mainCode, null);
      assert.notEqual(mainCode, "0x");
      assert.notEqual(mainCode, "0x0");

      // Now make sure it matches exactly.
      forkedWeb3.eth.getCode(contractAddress, function(err, forkedCode) {
        if (err) return done(err);

        assert.equal(mainCode, forkedCode);
        done();
      });
    });
  });

  it("should be able to get the balance of an address in the forked provider via the main provider", function(done) {
    // Assert preconditions
    var first_forked_account = forkedAccounts[0];
    assert(mainAccounts.indexOf(first_forked_account) < 0);

    // Now for the real test: Get the balance of a forked account through the main provider.
    mainWeb3.eth.getBalance(first_forked_account, function(err, balance) {
      if (err) return done(err);

      // We don't assert the exact balance as transactions cost eth
      assert(balance > 999999);
      done();
    });
  });

  it("should be able to get storage values on the forked provider via the main provider", function(done) {
    mainWeb3.eth.getStorageAt(contractAddress, contract.position_of_value, function(err, result) {
      if (err) return done(err);
      assert.equal(mainWeb3.utils.hexToNumber(result), 7);
      done();
    });
  });

  it("should be able to execute calls against a contract on the forked provider via the main provider", function(done) {
    var example = new mainWeb3.eth.Contract(JSON.parse(contract.abi), contractAddress);

    // TODO: ugly workaround - not sure why this is necessary.
    if (!example._requestManager.provider) {
      example._requestManager.setProvider(web3.eth._provider);
    }

    example.methods.value().call({from: mainAccounts[0]}, function(err, result){
      if (err) return done(err);
      assert.equal(mainWeb3.utils.hexToNumber(result), 7);

      // Make the call again to ensure caches updated and the call still works.
      example.methods.value().call({from: mainAccounts[0]}, function(err, result){
        if (err) return done(err);
        assert.equal(mainWeb3.utils.hexToNumber(result), 7);
        done(err);
      });
    });
  });

  it("should be able to make a transaction on the main provider while not transacting on the forked provider", function(done) {
    var example = new mainWeb3.eth.Contract(JSON.parse(contract.abi), contractAddress);

    // TODO: ugly workaround - not sure why this is necessary.
    if (!example._requestManager.provider) {
      example._requestManager.setProvider(web3.eth._provider);
    }

    var forkedExample = new forkedWeb3.eth.Contract(JSON.parse(contract.abi), contractAddress);

    // TODO: ugly workaround - not sure why this is necessary.
    if (!forkedExample._requestManager.provider) {
      forkedExample._requestManager.setProvider(forkedWeb3.eth._provider);
    }

    example.methods.setValue(25).send({from: mainAccounts[0]}, function(err) {
      if (err) return done(err);

      // It insta-mines, so we can make a call directly after.
      example.methods.value().call({from: mainAccounts[0]}, function(err, result) {
        if (err) return done(err);
        assert.equal(mainWeb3.utils.hexToNumber(result), 25);

        // Now call back to the forked to ensure it's value stayed 5
        forkedExample.methods.value().call({from: forkedAccounts[0]}, function(err, result) {
          if (err) return done(err);
          assert.equal(forkedWeb3.utils.hexToNumber(result), 7);
          done();
        })
      });
    });
  });

  it("should ignore continued transactions on the forked blockchain by pegging the forked block number", function(done) {
    // In this test, we're going to use the second contract address that we haven't
    // used previously. This ensures the data hasn't been cached on the main web3 trie
    // yet, and it will require it forked to the forked provider at a specific block.
    // If that block handling is done improperly, this should fail.

    var example = new mainWeb3.eth.Contract(JSON.parse(contract.abi), secondContractAddress);

    // TODO: ugly workaround - not sure why this is necessary.
    if (!example._requestManager.provider) {
      example._requestManager.setProvider(web3.eth._provider);
    }

    var forkedExample = new forkedWeb3.eth.Contract(JSON.parse(contract.abi), secondContractAddress);

    // TODO: ugly workaround - not sure why this is necessary.
    if (!forkedExample._requestManager.provider) {
      forkedExample._requestManager.setProvider(forkedWeb3.eth._provider);
    }

    // This transaction happens entirely on the forked chain after forking.
    // It should be ignored by the main chain.
    forkedExample.methods.setValue(800).send({from: forkedAccounts[0]}, function(err, result) {
      if (err) return done(err);
      // Let's assert the value was set correctly.
      forkedExample.methods.value().call({from: forkedAccounts[0]}, function(err, result) {
        if (err) return done(err);
        assert.equal(forkedWeb3.utils.hexToNumber(result), 800);

        // Now lets check the value on the main chain. It shouldn't be 800.
        example.methods.value().call({from: mainAccounts[0]}, function(err, result) {
          if (err) return done(err);

          assert.equal(mainWeb3.utils.hexToNumber(result), 5);
          done();
        })
      })
    });
  });

  it("should maintain a block number that includes new blocks PLUS the existing chain", function(done) {
    // Note: The main provider should be at block 5 at this test. Reasoning:
    // - The forked chain has an initial block, which is block 0.
    // - The forked chain performed a transaction that produced a log, resulting in block 1.
    // - The forked chain had two transactions initially, resulting blocks 2 and 3.
    // - The main chain forked from there, creating its own initial block, block 4.
    // - Then the main chain performed a transaction, putting it at block 5.

    mainWeb3.eth.getBlockNumber(function(err, result) {
      if (err) return done(err);

      assert.equal(mainWeb3.utils.hexToNumber(result), 5);

      // Now lets get a block that exists on the forked chain.
      mainWeb3.eth.getBlock(0, function(err, mainBlock) {
        if (err) return done(err);

        // And compare it to the forked chain's block
        forkedWeb3.eth.getBlock(0, function(err, forkedBlock) {
          if (err) return done(err);

          // Block hashes should be the same.
          assert.equal(mainBlock.hash, forkedBlock.hash);

          // Now make sure we can get the block by hash as well.
          mainWeb3.eth.getBlock(mainBlock.hash, function(err, mainBlockByHash) {
            if (err) return done(err);

            assert.equal(mainBlock.hash, mainBlockByHash.hash);
            done();
          });
        });
      });
    });
  });

  it("should have a genesis block whose parent is the last block from the forked provider", function(done) {
    forkedWeb3.eth.getBlock(forkBlockNumber, function(err, forkedBlock) {
      if (err) return done(err);

      var parentHash = forkedBlock.hash;

      var mainGenesisNumber = mainWeb3.utils.hexToNumber(forkBlockNumber) + 1;
      mainWeb3.eth.getBlock(mainGenesisNumber, function(err, mainGenesis) {
        if (err) return done(err);

        assert.equal(mainGenesis.parentHash, parentHash);
        done();
      })
    });
  });

  // Note: This test also puts a new contract on the forked chain, which is a good test.
  it("should represent the block number correctly in the Oracle contract (oracle.blockhash0), providing forked block hash and number", function() {
    this.timeout(10000)
    var oracleSol = fs.readFileSync("./test/Oracle.sol", {encoding: "utf8"});
    var solcResult = solc.compile(oracleSol);
    var oracleOutput = solcResult.contracts[":Oracle"];

    return new mainWeb3.eth.Contract(JSON.parse(oracleOutput.interface))
      .deploy({ data: oracleOutput.bytecode })
      .send({ from: mainAccounts[0], gas: 3141592 })
      .then(function(oracle){
        // TODO: ugly workaround - not sure why this is necessary.
        if (!oracle._requestManager.provider) {
          oracle._requestManager.setProvider(mainWeb3.eth._provider);
        }
        return mainWeb3.eth.getBlock(0).then(function(block){
          return oracle.methods.blockhash0().call()
            .then(function(blockhash) {
              assert.equal(blockhash, block.hash);
              // Now check the block number.
              return mainWeb3.eth.getBlockNumber()
            })
        }).then(function(expected_number) {
          return oracle.methods.currentBlock().call()
            .then(function(number) {
              assert.equal(number, expected_number + 1);
              return oracle.methods.setCurrentBlock().send({from: mainAccounts[0], gas: 3141592})
            }).then(function(tx) {
              return oracle.methods.lastBlock().call({from: mainAccounts[0]})
            }).then(function(val) {
              assert.equal(to.number(val), expected_number + 1);
            });
        });
      });
  });

  // TODO
  it("should be able to get logs across the fork boundary", function(done) {
    this.timeout(30000)

    var example = new mainWeb3.eth.Contract(JSON.parse(contract.abi), contractAddress);

    // TODO: ugly workaround - not sure why this is necessary.
    if (!example._requestManager.provider) {
      example._requestManager.setProvider(web3.eth._provider);
    }

    var event = example.events.ValueSet({fromBlock: 0, toBlock: "latest"});

    var callcount = 0
    event.on('data', function(log) {
      callcount++
      if (callcount == 2) {
        event.removeAllListeners()
        done()
      }
    });
  });

  it("should return the correct nonce based on block number", function(done) {
    // Note for the first two requests, we choose the block numbers 1 before and after the fork to
    // ensure we're pulling data off the correct provider in both cases.
    async.parallel({
      nonceBeforeFork: mainWeb3.eth.getTransactionCount.bind(mainWeb3.eth, forkedAccounts[0], forkBlockNumber - 1),
      nonceAtFork: mainWeb3.eth.getTransactionCount.bind(mainWeb3.eth, forkedAccounts[0], forkBlockNumber + 1),
      nonceLatestMain: mainWeb3.eth.getTransactionCount.bind(mainWeb3.eth, forkedAccounts[0], "latest"),
      nonceLatestFallback: forkedWeb3.eth.getTransactionCount.bind(forkedWeb3.eth, forkedAccounts[0], "latest")
    }, function(err, results) {
      if (err) return done(err);

      var nonceBeforeFork = results.nonceBeforeFork;
      var nonceAtFork  = results.nonceAtFork;
      var nonceLatestMain = results.nonceLatestMain;
      var nonceLatestFallback = results.nonceLatestFallback;

      // First ensure our nonces for the block before the fork
      // Note that we're asking for the block *before* the forked block,
      // which automatically means we sacrifice a transaction (i.e., one nonce value)
      assert.equal(nonceBeforeFork, initialFallbackAccountState.nonce - 1);

      // Now check at the fork. We should expect our initial state.
      assert.equal(nonceAtFork, initialFallbackAccountState.nonce);

      // Make sure the main web3 provider didn't alter the state of the forked account.
      // This means the nonce should stay the same.
      assert.equal(nonceLatestMain, initialFallbackAccountState.nonce);

      // And since we made one additional transaction with this account on the forked
      // provider AFTER the fork, it's nonce should be one ahead, and the main provider's
      // nonce for that address shouldn't acknowledge it.
      assert.equal(nonceLatestFallback, nonceLatestMain + 1);

      done();
    });
  });

  it("should return the correct balance based on block number", function(done) {
    // Note for the first two requests, we choose the block numbers 1 before and after the fork to
    // ensure we're pulling data off the correct provider in both cases.
    async.parallel({
      balanceBeforeFork: mainWeb3.eth.getBalance.bind(mainWeb3.eth, forkedAccounts[0], forkBlockNumber - 1),
      balanceAfterFork: mainWeb3.eth.getBalance.bind(mainWeb3.eth, forkedAccounts[0], forkBlockNumber + 1),
      balanceLatestMain: mainWeb3.eth.getBalance.bind(mainWeb3.eth, forkedAccounts[0], "latest"),
      balanceLatestFallback: forkedWeb3.eth.getBalance.bind(forkedWeb3.eth, forkedAccounts[0], "latest")
    }, function(err, results) {
      if (err) return done(err);

      var balanceBeforeFork = mainWeb3.utils.toBN(results.balanceBeforeFork);
      var balanceAfterFork  = mainWeb3.utils.toBN(results.balanceAfterFork);
      var balanceLatestMain = mainWeb3.utils.toBN(results.balanceLatestMain);
      var balanceLatestFallback = mainWeb3.utils.toBN(results.balanceLatestFallback);

      // First ensure our balances for the block before the fork
      // We do this by simply ensuring the balance has decreased since exact values
      // are hard to assert in this case.
      assert(balanceBeforeFork.gt(balanceAfterFork));

      // Since the forked provider had once extra transaction for this account,
      // it should have a lower balance, and the main provider shouldn't acknowledge
      // that transaction.
      assert(balanceLatestMain.gt(balanceLatestFallback));

      done();
    });
  });

  it("should return the correct code based on block number", function(done) {
    // This one is simpler than the previous two. Either the code exists or doesn't.
    async.parallel({
      codeEarliest: mainWeb3.eth.getCode.bind(mainWeb3.eth, contractAddress, "earliest"),
      codeAfterFork: mainWeb3.eth.getCode.bind(mainWeb3.eth, contractAddress, forkBlockNumber + 1),
      codeLatest: mainWeb3.eth.getCode.bind(mainWeb3.eth, contractAddress, "latest")
    }, function(err, results) {
      if (err) return done(err);

      var codeEarliest = results.codeEarliest;
      var codeAfterFork = results.codeAfterFork;
      var codeLatest = results.codeLatest;

      // There should be no code initially.
      assert.equal(to.number(codeEarliest), 0)

      // Arbitrary length check since we can't assert the exact value
      assert(codeAfterFork.length > 20);
      assert(codeLatest.length > 20);

      // These should be the same since code can't change.
      assert.equal(codeAfterFork, codeLatest);

      done();
    })
  });

  it("should return transactions for blocks requested before the fork", function(done) {
    forkedWeb3.eth.getTransactionReceipt(initialDeployTransactionHash, function(err, receipt) {
      if (err) return done(err);

      forkedWeb3.eth.getBlock(receipt.blockNumber, true, function(err, referenceBlock) {
        if (err) return done(err);

        mainWeb3.eth.getBlock(receipt.blockNumber, true, function(err, forkedBlock) {
          if (err) return done(err);

          assert.equal(forkedBlock.transactions.length, referenceBlock.transactions.length)
          assert.deepEqual(forkedBlock.transactions, referenceBlock.transactions);
          done();
        });
      });
    });
  });

  it("should return a transaction for transactions made before the fork", function(done) {
    forkedWeb3.eth.getTransaction(initialDeployTransactionHash, function(err, referenceTransaction) {
      if (err) return done(err);

      mainWeb3.eth.getTransaction(initialDeployTransactionHash, function(err, forkedTransaction) {
        if (err) return done(err);

        assert.deepEqual(referenceTransaction, forkedTransaction);
        done();
      });
    });
  });

  it("should return a transaction receipt for transactions made before the fork", function(done) {
    forkedWeb3.eth.getTransactionReceipt(initialDeployTransactionHash, function(err, referenceReceipt) {
      if (err) return done(err);
      assert.deepEqual(referenceReceipt.transactionHash, initialDeployTransactionHash)

      mainWeb3.eth.getTransactionReceipt(initialDeployTransactionHash, function(err, forkedReceipt) {
        if (err) return done(err);

        assert.deepEqual(forkedReceipt.transactionHash, initialDeployTransactionHash)
        assert.deepEqual(referenceReceipt, forkedReceipt);
        done();
      });
    });
  })

  it("should return the same network version as the chain it forked from", function(done) {
    forkedWeb3.eth.net.getId(function(err, forkedNetwork) {
      if (err) return done(err);

      mainWeb3.eth.net.getId(function(err, mainNetwork) {
        if (err) return done(err);

        assert.equal(mainNetwork, forkedNetwork);
        done();
      });
    })
  });

  after("Shutdown server", function(done) {
    forkedWeb3._provider.connection.close()
    forkedServer.close(function(serverCloseErr) {
      forkedWeb3.setProvider();
      let mainProvider = mainWeb3._provider;
      mainWeb3.setProvider();
      mainProvider.close(function(providerCloseErr) {
        if (serverCloseErr) return done(serverCloseErr);
        if (providerCloseErr) return done(providerCloseErr);
        done()
      });
    });
  });
});
