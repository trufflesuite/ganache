var Web3 = require("web3");
var Web3WsProvider = require("web3-providers-ws");
var assert = require("assert");
var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
var fs = require("fs");
var solc = require("solc");
var to = require("../lib/utils/to.js");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

var logger = {
  log: function(msg) {
    /* console.log(msg) */
  }
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
    this.timeout(10000);
    var source = fs.readFileSync("./test/Example.sol", { encoding: "utf8" });
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
        gas: "0x2fefd8",
        gasPrice: "0x1", // This is important, as passing it has exposed errors in the past.
        to: null, // set by test
        data: "0x3fa4f245"
      },
      transaction_data: {
        from: null, // set by test
        gas: "0x2fefd8",
        to: null, // set by test
        data: "0x552410770000000000000000000000000000000000000000000000000000000000000019" // sets value to 25 (base 10)
      }
    };
  });

  before("Initialize Fallback Ganache server", function(done) {
    this.timeout(10000);
    forkedServer = Ganache.server({
      // Do not change seed. Determinism matters for these tests.
      seed: "let's make this deterministic",
      ws: true,
      logger: logger
    });

    forkedServer.listen(21345, function(err) {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  before("set forkedWeb3 provider", function(done) {
    forkedWeb3.setProvider(new Web3WsProvider(forkedTargetUrl));
    done();
  });

  before("Gather forked accounts", async function() {
    this.timeout(5000);
    forkedAccounts = await forkedWeb3.eth.getAccounts();
  });

  before("Deploy initial contracts", async function() {
    let receipt = await forkedWeb3.eth.sendTransaction({
      from: forkedAccounts[0],
      data: contract.binary,
      gas: 3141592
    });

    // Save this for a later test.
    initialDeployTransactionHash = receipt.transactionHash;

    contractAddress = receipt.contractAddress;

    let code = await forkedWeb3.eth.getCode(contractAddress);

    // Ensure there's *something* there.
    assert.notStrictEqual(code, null);
    assert.notStrictEqual(code, "0x");
    assert.notStrictEqual(code, "0x0");

    // Deploy a second one, which we won't use often.
    forkedWeb3.eth.sendTransaction({
      from: forkedAccounts[0],
      data: contract.binary,
      gas: 3141592
    });

    secondContractAddress = receipt.contractAddress;
  });

  before("Make a transaction on the forked chain that produces a log", async function() {
    this.timeout(10000);

    var forkedExample = new forkedWeb3.eth.Contract(JSON.parse(contract.abi), contractAddress);

    var event = forkedExample.events.ValueSet({});

    let p = new Promise(async function(resolve, reject) {
      event.once("data", function(logs) {
        resolve();
      });
    });

    await forkedExample.methods.setValue(7).send({ from: forkedAccounts[0] });
    await p;
  });

  before("Get initial balance and nonce", async function() {
    let balance = await forkedWeb3.eth.getBalance(forkedAccounts[0]);
    let nonce = await forkedWeb3.eth.getTransactionCount(forkedAccounts[0]);

    initialFallbackAccountState = {
      balance,
      nonce: to.number(nonce)
    };
  });

  before("Set main web3 provider, forking from forked chain at this point", async function() {
    mainWeb3.setProvider(
      Ganache.provider({
        fork: forkedTargetUrl.replace("ws", "http"),
        logger,
        // Do not change seed. Determinism matters for these tests.
        seed: "a different seed"
      })
    );

    forkBlockNumber = await forkedWeb3.eth.getBlockNumber();
  });

  before("Gather main accounts", async function() {
    this.timeout(5000);
    mainAccounts = await mainWeb3.eth.getAccounts();
  });

  it("should fetch a contract from the forked provider via the main provider", async function() {
    let mainCode = await mainWeb3.eth.getCode(contractAddress);
    // Ensure there's *something* there.
    assert.notStrictEqual(mainCode, null);
    assert.notStrictEqual(mainCode, "0x");
    assert.notStrictEqual(mainCode, "0x0");

    // Now make sure it matches exactly.
    let forkedCode = await forkedWeb3.eth.getCode(contractAddress);

    assert.strictEqual(mainCode, forkedCode);
  });

  it("should get the balance of an address in the forked provider via the main provider", async function() {
    // Assert preconditions
    var firstForkedAccount = forkedAccounts[0];
    assert(mainAccounts.indexOf(firstForkedAccount) < 0);

    // Now for the real test: Get the balance of a forked account through the main provider.
    let balance = await mainWeb3.eth.getBalance(firstForkedAccount);

    // We don't assert the exact balance as transactions cost eth
    assert(balance > 999999);
  });

  it("should get storage values on the forked provider via the main provider", async function() {
    let result = await mainWeb3.eth.getStorageAt(contractAddress, contract.position_of_value);
    assert.strictEqual(mainWeb3.utils.hexToNumber(result), 7);
  });

  it("should execute calls against a contract on the forked provider via the main provider", async function() {
    var example = new mainWeb3.eth.Contract(JSON.parse(contract.abi), contractAddress);

    let result = await example.methods.value().call({ from: mainAccounts[0] });
    assert.strictEqual(mainWeb3.utils.hexToNumber(result), 7);

    // Make the call again to ensure caches updated and the call still works.
    result = await example.methods.value().call({ from: mainAccounts[0] });
    assert.strictEqual(mainWeb3.utils.hexToNumber(result), 7);
  });

  it("should make a transaction on the main provider while not transacting on the forked provider", async function() {
    var example = new mainWeb3.eth.Contract(JSON.parse(contract.abi), contractAddress);

    var forkedExample = new forkedWeb3.eth.Contract(JSON.parse(contract.abi), contractAddress);

    await example.methods.setValue(25).send({ from: mainAccounts[0] });

    // It insta-mines, so we can make a call directly after.
    let result = await example.methods.value().call({ from: mainAccounts[0] });
    assert.strictEqual(mainWeb3.utils.hexToNumber(result), 25);

    // Now call back to the forked to ensure it's value stayed 5
    result = await forkedExample.methods.value().call({ from: forkedAccounts[0] });
    assert.strictEqual(forkedWeb3.utils.hexToNumber(result), 7);
  });

  it("should ignore transactions on the forked chain after forked block", async function() {
    // In this test, we're going to use the second contract address that we haven't
    // used previously. This ensures the data hasn't been cached on the main web3 trie
    // yet, and it will require it forked to the forked provider at a specific block.
    // If that block handling is done improperly, this should fail.

    var example = new mainWeb3.eth.Contract(JSON.parse(contract.abi), secondContractAddress);

    var forkedExample = new forkedWeb3.eth.Contract(JSON.parse(contract.abi), secondContractAddress);

    // This transaction happens entirely on the forked chain after forking.
    // It should be ignored by the main chain.
    await forkedExample.methods.setValue(800).send({ from: forkedAccounts[0] });
    // Let's assert the value was set correctly.
    let result = await forkedExample.methods.value().call({ from: forkedAccounts[0] });
    assert.strictEqual(to.number(result), 800);

    // Now lets check the value on the main chain. It shouldn't be 800.
    result = await example.methods.value().call({ from: mainAccounts[0] });

    assert.notStrictEqual(mainWeb3.utils.hexToNumber(result), 800);
  });

  it("should maintain a block number that includes new blocks PLUS the existing chain", async function() {
    // Note: The main provider should be at block 5 at this test. Reasoning:
    // - The forked chain has an initial block, which is block 0.
    // - The forked chain performed a transaction that produced a log, resulting in block 1.
    // - The forked chain had two transactions initially, resulting blocks 2 and 3.
    // - The main chain forked from there, creating its own initial block, block 4.
    // - Then the main chain performed a transaction, putting it at block 5.

    let result = await mainWeb3.eth.getBlockNumber();

    assert.strictEqual(mainWeb3.utils.hexToNumber(result), 5);

    // Now lets get a block that exists on the forked chain.
    let mainBlock = await mainWeb3.eth.getBlock(0);

    // And compare it to the forked chain's block
    let forkedBlock = await forkedWeb3.eth.getBlock(0);

    // Block hashes should be the same.
    assert.strictEqual(mainBlock.hash, forkedBlock.hash);

    // Now make sure we can get the block by hash as well.
    let mainBlockByHash = await mainWeb3.eth.getBlock(mainBlock.hash);

    assert.strictEqual(mainBlock.hash, mainBlockByHash.hash);
  });

  it("should have a genesis block whose parent is the last block from the forked provider", async function() {
    let forkedBlock = await forkedWeb3.eth.getBlock(forkBlockNumber);
    let parentHash = forkedBlock.hash;

    let mainGenesisNumber = mainWeb3.utils.hexToNumber(forkBlockNumber) + 1;
    let mainGenesis = await mainWeb3.eth.getBlock(mainGenesisNumber);

    assert.strictEqual(mainGenesis.parentHash, parentHash);
  });

  // Note: This test also puts a new contract on the forked chain, which is a good test.
  it(
    "should represent the block number correctly in the Oracle contract (oracle.blockhash0)," +
    " providing forked block hash and number",
    async function() {
      this.timeout(10000);
      const oracleSol = fs.readFileSync("./test/Oracle.sol", { encoding: "utf8" });
      const solcResult = solc.compile(oracleSol);
      const oracleOutput = solcResult.contracts[":Oracle"];

      const contract = new mainWeb3.eth.Contract(JSON.parse(oracleOutput.interface));
      const deployTxn = contract.deploy({ data: oracleOutput.bytecode });
      const oracle = await deployTxn.send({ from: mainAccounts[0], gas: 3141592 });

      const block = await mainWeb3.eth.getBlock(0);
      const blockhash = await oracle.methods.blockhash0().call();
      assert.strictEqual(blockhash, block.hash);

      const expectedNumber = await mainWeb3.eth.getBlockNumber();

      const number = await oracle.methods.currentBlock().call();
      assert.strictEqual(to.number(number), expectedNumber + 1);

      await oracle.methods.setCurrentBlock().send({ from: mainAccounts[0], gas: 3141592 });
      const val = await oracle.methods.lastBlock().call({ from: mainAccounts[0] });
      assert.strictEqual(to.number(val), expectedNumber + 1);
    }
  );

  // TODO: refactor this to not use web3
  it("should be able to get logs across the fork boundary", function(done) {
    this.timeout(30000);

    let example = new mainWeb3.eth.Contract(JSON.parse(contract.abi), contractAddress);

    let event = example.events.ValueSet({ fromBlock: 0, toBlock: "latest" });

    let callcount = 0;

    event.on("data", function(log) {
      callcount++;
      if (callcount === 2) {
        event.removeAllListeners();
        done();
      }
    });
  });

  it("should return the correct nonce based on block number", async function() {
    // Note for the first two requests, we choose the block numbers 1 before and after the fork to
    // ensure we're pulling data off the correct provider in both cases.
    let nonceBeforeFork = await mainWeb3.eth.getTransactionCount(forkedAccounts[0], forkBlockNumber - 1);
    let nonceAtFork = await mainWeb3.eth.getTransactionCount(forkedAccounts[0], forkBlockNumber + 1);
    let nonceLatestMain = await mainWeb3.eth.getTransactionCount(forkedAccounts[0], "latest");
    let nonceLatestFallback = await forkedWeb3.eth.getTransactionCount(forkedAccounts[0], "latest");

    // First ensure our nonces for the block before the fork
    // Note that we're asking for the block *before* the forked block,
    // which automatically means we sacrifice a transaction (i.e., one nonce value)
    assert.strictEqual(nonceBeforeFork, initialFallbackAccountState.nonce - 1);

    // Now check at the fork. We should expect our initial state.
    assert.strictEqual(nonceAtFork, initialFallbackAccountState.nonce);

    // Make sure the main web3 provider didn't alter the state of the forked account.
    // This means the nonce should stay the same.
    assert.strictEqual(nonceLatestMain, initialFallbackAccountState.nonce);

    // And since we made one additional transaction with this account on the forked
    // provider AFTER the fork, it's nonce should be one ahead, and the main provider's
    // nonce for that address shouldn't acknowledge it.
    assert.strictEqual(nonceLatestFallback, nonceLatestMain + 1);
  });

  it("should return the correct balance based on block number", async function() {
    // Note for the first two requests, we choose the block numbers 1 before and after the fork to
    // ensure we're pulling data off the correct provider in both cases.
    let balanceBeforeFork = new mainWeb3.utils.BN(
      await mainWeb3.eth.getBalance(forkedAccounts[0], forkBlockNumber - 1)
    );
    let balanceAfterFork = new mainWeb3.utils.BN(
      await mainWeb3.eth.getBalance(forkedAccounts[0], forkBlockNumber + 1)
    );
    let balanceLatestMain = new mainWeb3.utils.BN(
      await mainWeb3.eth.getBalance(forkedAccounts[0], "latest")
    );
    let balanceLatestFallback = new mainWeb3.utils.BN(
      await forkedWeb3.eth.getBalance(forkedAccounts[0], "latest")
    );

    // First ensure our balances for the block before the fork
    // We do this by simply ensuring the balance has decreased since exact values
    // are hard to assert in this case.
    assert(balanceBeforeFork.gt(balanceAfterFork));

    // Make sure it's not substantially larger. it should only be larger by a small
    // amount (<2%). This assertion was added since forked balances were previously
    // incorrectly being converted between decimal and hex
    assert(balanceBeforeFork.muln(0.95).lt(balanceAfterFork));

    // Since the forked provider had once extra transaction for this account,
    // it should have a lower balance, and the main provider shouldn't acknowledge
    // that transaction.
    assert(balanceLatestMain.gt(balanceLatestFallback));

    // Make sure it's not substantially larger. it should only be larger by a small
    // amount (<2%). This assertion was added since forked balances were previously
    // incorrectly being converted between decimal and hex
    assert(balanceLatestMain.muln(0.95).lt(balanceLatestFallback));
  });

  it("should return the correct code based on block number", async function() {
    // This one is simpler than the previous two. Either the code exists or doesn't.
    let codeEarliest = await mainWeb3.eth.getCode(contractAddress, "earliest");
    let codeAfterFork = await mainWeb3.eth.getCode(contractAddress, forkBlockNumber + 1);
    let codeLatest = await mainWeb3.eth.getCode(contractAddress, "latest");

    // There should be no code initially.
    assert.strictEqual(codeEarliest, "0x");

    // Arbitrary length check since we can't assert the exact value
    assert(codeAfterFork.length > 20);
    assert(codeLatest.length > 20);

    // These should be the same since code can't change.
    assert.strictEqual(codeAfterFork, codeLatest);
  });

  it("should return transactions for blocks requested before the fork", async function() {
    let receipt = await forkedWeb3.eth.getTransactionReceipt(initialDeployTransactionHash);
    let referenceBlock = await forkedWeb3.eth.getBlock(receipt.blockNumber, true);
    let forkedBlock = await mainWeb3.eth.getBlock(receipt.blockNumber, true);
    assert.strictEqual(forkedBlock.transactions.length, referenceBlock.transactions.length);
    assert.deepStrictEqual(forkedBlock.transactions, referenceBlock.transactions);
  });

  it("should return a transaction for transactions made before the fork", async function() {
    let referenceTransaction = await forkedWeb3.eth.getTransaction(initialDeployTransactionHash);
    let forkedTransaction = await mainWeb3.eth.getTransaction(initialDeployTransactionHash);
    assert.deepStrictEqual(referenceTransaction, forkedTransaction);
  });

  it("should return a transaction receipt for transactions made before the fork", async function() {
    let referenceReceipt = await forkedWeb3.eth.getTransactionReceipt(initialDeployTransactionHash);
    assert.deepStrictEqual(referenceReceipt.transactionHash, initialDeployTransactionHash);

    let forkedReceipt = await mainWeb3.eth.getTransactionReceipt(initialDeployTransactionHash);

    assert.deepStrictEqual(forkedReceipt.transactionHash, initialDeployTransactionHash);
    assert.deepStrictEqual(referenceReceipt, forkedReceipt);
  });

  it("should return the same network version as the chain it forked from", async function() {
    let forkedNetwork = await forkedWeb3.eth.net.getId();
    let mainNetwork = await mainWeb3.eth.net.getId();
    assert.strictEqual(mainNetwork, forkedNetwork);
  });

  it("should trace a successful transaction", async function() {
    let block = await mainWeb3.eth.getBlock("latest");
    let hash = block.transactions[0];

    await new Promise((resolve, reject) => {
      mainWeb3._provider.send(
        {
          jsonrpc: "2.0",
          method: "debug_traceTransaction",
          params: [hash, []],
          id: new Date().getTime()
        },
        function(err, response) {
          if (err) {
            reject(err);
          }
          if (response.error) {
            reject(response.error);
          }
          resolve();
        });
    });
  });

  after("Shutdown server", function(done) {
    forkedWeb3._provider.connection.close();
    forkedServer.close(function(serverCloseErr) {
      forkedWeb3.setProvider();
      let mainProvider = mainWeb3._provider;
      mainWeb3.setProvider();
      mainProvider.close(function(providerCloseErr) {
        if (serverCloseErr) {
          return done(serverCloseErr);
        }
        if (providerCloseErr) {
          return done(providerCloseErr);
        }
        done();
      });
    });
  });
});
