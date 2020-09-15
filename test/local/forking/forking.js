const Transaction = require("../../../lib/utils/transaction");
var Web3 = require("web3");
var Web3WsProvider = require("web3-providers-ws");
var assert = require("assert");
var Ganache = require(process.env.TEST_BUILD
  ? "../../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../../index.js");

const compile = require("../../helpers/contract/singleFileCompile");
var to = require("../../../lib/utils/to.js");
var generateSend = require("../../helpers/utils/rpc");

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
  var thirdContractAddress; // the same contract deployed to the fork ("mainWeb3")
  var forkedServer;
  var mainAccounts;
  var forkedAccounts;

  var initialFallbackAccountState = {};

  var forkedWeb3 = new Web3();
  var mainWeb3 = new Web3();

  var forkedWeb3NetworkId = Date.now();
  var forkedWeb3Port = 21345;
  var forkedTargetUrl = "ws://localhost:" + forkedWeb3Port;
  var forkBlockNumber;

  var initialDeployTransactionHash;
  var variableChangedBlockNumber;

  before("set up test data", function() {
    this.timeout(10000);
    const { result, source } = compile("./test/contracts/examples/", "Example");

    // Note: Certain properties of the following contract data are hardcoded to
    // maintain repeatable tests. If you significantly change the solidity code,
    // make sure to update the resulting contract data with the correct values.
    const example = result.contracts["Example.sol"].Example;
    contract = {
      solidity: source,
      abi: example.abi,
      binary: "0x" + example.evm.bytecode.object,
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

  before("Initialize Fallback Ganache server", async() => {
    forkedServer = Ganache.server({
      // Do not change seed. Determinism matters for these tests.
      seed: "let's make this deterministic",
      ws: true,
      logger: logger,
      network_id: forkedWeb3NetworkId
    });

    await forkedServer.listen(forkedWeb3Port);
  });

  before("set forkedWeb3 provider", () => {
    forkedWeb3.setProvider(new Web3WsProvider(forkedTargetUrl));
  });

  before("Gather forked accounts", async() => {
    forkedAccounts = await forkedWeb3.eth.getAccounts();
  });

  before("Deploy initial contracts", async() => {
    const receipt = await forkedWeb3.eth.sendTransaction({
      from: forkedAccounts[0],
      data: contract.binary,
      gas: 3141592
    });

    // Save this for a later test.
    initialDeployTransactionHash = receipt.transactionHash;
    contractAddress = receipt.contractAddress;

    // Ensure there's *something* there.
    const code = await forkedWeb3.eth.getCode(contractAddress);
    assert.notStrictEqual(code, null);
    assert.notStrictEqual(code, "0x");
    assert.notStrictEqual(code, "0x0");

    // Deploy a second one, which we won't use often.
    const receipt2 = await forkedWeb3.eth.sendTransaction({
      from: forkedAccounts[0],
      data: contract.binary,
      gas: 3141592
    });

    secondContractAddress = receipt2.contractAddress;
  });

  before("Make a transaction on the forked chain that produces a log", async() => {
    var forkedExample = new forkedWeb3.eth.Contract(contract.abi, contractAddress);
    var event = forkedExample.events.ValueSet({});

    const eventData = new Promise((resolve, reject) => {
      event.once("data", function(logs) {
        resolve();
      });
    });

    await forkedExample.methods.setValue(7).send({ from: forkedAccounts[0] });
    await eventData;
  });

  before("Get initial balance and nonce", async() => {
    const [balance, nonce] = await Promise.all([
      forkedWeb3.eth.getBalance(forkedAccounts[0]),
      forkedWeb3.eth.getTransactionCount(forkedAccounts[0])
    ]);
    initialFallbackAccountState = {
      nonce: to.number(nonce),
      balance
    };
  });

  before("Set main web3 provider, forking from forked chain at this point", async() => {
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

  before("Gather main accounts", async() => {
    mainAccounts = await mainWeb3.eth.getAccounts();
  });
  before("Deploy a conttact to the main chain", async() => {
    // Deploy a third one, which is used to verify the forked storage provider's duck punching
    // works as expected on it's own data.
    const receipt3 = await mainWeb3.eth.sendTransaction({
      from: mainAccounts[0],
      data: contract.binary,
      gas: 3141592
    });

    thirdContractAddress = receipt3.contractAddress;
  });

  before("Make a transaction on the main chain using the it's own contract", async() => {
    var mainExample = new mainWeb3.eth.Contract(contract.abi, thirdContractAddress);
    var event = mainExample.events.ValueSet({});

    const eventData = new Promise((resolve) => {
      event.once("data", () => {
        resolve();
      });
    });

    const receipt = await mainExample.methods.setValue(7).send({ from: mainAccounts[0] });
    variableChangedBlockNumber = receipt.blockNumber;
    await eventData;
  });

  it("should get the id of the forked chain", async() => {
    const id = await mainWeb3.eth.net.getId();
    assert.strictEqual(id, forkedWeb3NetworkId);
  });

  describe("cache", () => {
    function testCache(forkCacheSize, expectedCalls) {
      return async() => {
        async function checkIt(baseLine) {
          const r = await send("eth_getStorageAt", ...params);
          const testResult = Object.assign({}, r, { id: null });
          assert.deepStrictEqual(testResult, baseLine);
        }

        const provider = Ganache.provider({ fork: forkedTargetUrl.replace("ws", "http"), forkCacheSize });
        const send = generateSend(provider);
        const params = [contractAddress, contract.position_of_value];
        let callCount = 0;
        const oldSend = forkedServer.provider.send;
        try {
          // patch the original server's send so we can listen in on calls made to it.
          forkedServer.provider.send = (...args) => {
            const payload = args[0];
            if (payload.method === "eth_getStorageAt" && payload.params[0] === contractAddress.toLowerCase()) {
              callCount++;
            }
            return oldSend.apply(forkedServer.provider, args);
          };

          // cache something by requesting stuff from the original chain:
          const result = await send("eth_getStorageAt", ...params);
          const baseLine = Object.assign({}, result, { id: null });
          assert.strictEqual(parseInt(baseLine.result), 7, "return value is incorrect");

          // then check that it is cached
          await checkIt(baseLine);
          await checkIt(baseLine);

          // put something else in the cache to give it a chance to be evicted
          await send("eth_getStorageAt", forkedAccounts[0], "0x0");

          await checkIt(baseLine);
          await checkIt(baseLine);

          // after all those checks, we should have `expectedCalls` into the original chain
          assert.strictEqual(callCount, expectedCalls, "cache didn't work");
        } finally {
          forkedServer.provider.send = oldSend;
        }
      };
    }

    it("should evict from the cache on successive calls to the same data when cache is small", testCache(1230, 2));

    it("should return from the cache on successive calls to the same data when cache is infinite", testCache(-1, 1));

    it("should not return from the cache on successive calls to the same data when cache is off", testCache(0, 5));

    it("should return from the cache on calls for same data when cache size is default", testCache(undefined, 1));
  });

  it("should match nonce of accounts on original chain", async() => {
    const provider = Ganache.provider({ fork: forkedTargetUrl, seed: forkedServer.ganacheProvider.options.seed });

    const send = generateSend(provider);
    const originalSend = generateSend(forkedServer.ganacheProvider);

    const accounts = await send("eth_accounts");
    assert.deepStrictEqual(
      accounts.result,
      forkedAccounts.map((a) => a.toLowerCase()),
      "generated accounts don't match"
    );

    const results = await Promise.all(
      accounts.result.map((account) => {
        const originalCountProm = originalSend("eth_getTransactionCount", account);
        const forkedCountProm = send("eth_getTransactionCount", account);
        return Promise.all([forkedCountProm, originalCountProm]);
      })
    );

    results.map(([forkedCount, originalCount]) => {
      assert.strictEqual(forkedCount.result, originalCount.result);
    });
  });

  it("should fetch a contract from the forked provider via the main provider", async() => {
    const mainCode = await mainWeb3.eth.getCode(contractAddress);
    // Ensure there's *something* there.
    assert.notStrictEqual(mainCode, null);
    assert.notStrictEqual(mainCode, "0x");
    assert.notStrictEqual(mainCode, "0x0");

    // Now make sure it matches exactly.
    const forkedCode = await forkedWeb3.eth.getCode(contractAddress);
    assert.strictEqual(mainCode, forkedCode);
  });

  it("internal `fork.send` should handle batched transactions", (done) => {
    // this is a weird test because we dont' actually use batched transactions in forking
    // but just in case we start doing so later, for whatever reason, I'm making sure it works now
    const tx1 = { id: 1, method: "eth_accounts", jsonrpc: "2.0", params: [] };
    const tx2 = { id: 2, method: "eth_getBalance", jsonrpc: "2.0", params: [forkedAccounts[0]] };
    const tx3 = { id: 3, method: "eth_chainId", jsonrpc: "2.0", params: [] };

    // gross? yes.
    mainWeb3.currentProvider.manager.state.blockchain.fork.send([tx1, tx2, tx3], (mainErr, mainResults) => {
      forkedWeb3.currentProvider.send([tx1, tx2, tx3], (_, forkedResults) => {
        assert.strictEqual(mainErr, null);
        assert.strictEqual(mainResults[0].id, tx1.id);
        assert.strictEqual(mainResults[1].id, tx2.id);
        assert.strictEqual(mainResults[2].id, tx3.id);
        assert.strictEqual(mainResults[0].result.length, 10);
        assert.strictEqual(mainResults[1].result, forkedResults[1].result);
        assert.strictEqual(mainResults[2].result, forkedResults[2].result);
        done();
      });
    });
  });

  it("should get the balance of an address in the forked provider via the main provider", async() => {
    // Assert preconditions
    const firstForkedAccount = forkedAccounts[0];
    assert(mainAccounts.indexOf(firstForkedAccount) < 0);

    // Now for the real test: Get the balance of a forked account through the main provider.
    const balance = await mainWeb3.eth.getBalance(firstForkedAccount);
    assert(balance > 999999);
  });

  it("should get storage values on the forked provider itself", async() => {
    const result = await mainWeb3.eth.getStorageAt(thirdContractAddress, contract.position_of_value);
    assert.strictEqual(mainWeb3.utils.hexToNumber(result), 7);
  });

  it("should get the correct storage values based on block", async() => {
    const result = await mainWeb3.eth.getStorageAt(
      thirdContractAddress,
      contract.position_of_value,
      variableChangedBlockNumber - 1
    );
    assert.strictEqual(mainWeb3.utils.hexToNumber(result), 5);
  });

  it("should get storage values on the forked provider via the main provider", async() => {
    const result = await mainWeb3.eth.getStorageAt(contractAddress, contract.position_of_value);
    assert.strictEqual(mainWeb3.utils.hexToNumber(result), 7);
  });

  it("should get storage values on the forked provider via the main provider at a block number", async() => {
    const result = await mainWeb3.eth.getStorageAt(contractAddress, contract.position_of_value, 1);
    assert.strictEqual(mainWeb3.utils.hexToNumber(result), 5);
  });

  it("should execute calls against a contract on the forked provider via the main provider", async() => {
    var example = new mainWeb3.eth.Contract(contract.abi, contractAddress);

    const result = await example.methods.value().call({ from: mainAccounts[0] });
    assert.strictEqual(parseInt(result, 10), 7);

    // Make the call again to ensure caches updated and the call still works.
    const result2 = await example.methods.value().call({ from: mainAccounts[0] });
    assert.strictEqual(parseInt(result2, 10), 7);
  });

  it("should make a transaction on the main provider while not transacting on the forked provider", async() => {
    var example = new mainWeb3.eth.Contract(contract.abi, contractAddress);

    var forkedExample = new forkedWeb3.eth.Contract(contract.abi, contractAddress);

    // TODO: ugly workaround - not sure why this is necessary.
    if (!forkedExample._requestManager.provider) {
      forkedExample._requestManager.setProvider(forkedWeb3.eth._provider);
    }

    await example.methods.setValue(25).send({ from: mainAccounts[0] });

    // It insta-mines, so we can make a call directly after.
    const result = await example.methods.value().call({ from: mainAccounts[0] });
    assert.strictEqual(parseInt(result, 10), 25);

    // Now call back to the forked to ensure it's value stayed 5
    const forkedResult = await forkedExample.methods.value().call({ from: forkedAccounts[0] });
    assert.strictEqual(parseInt(forkedResult, 10), 7);
  });

  it("should ignore continued transactions on the forked blockchain by pegging the forked block number", async() => {
    // In this test, we're going to use the second contract address that we haven't
    // used previously. This ensures the data hasn't been cached on the main web3 trie
    // yet, and it will require it forked to the forked provider at a specific block.
    // If that block handling is done improperly, this should fail.

    var example = new mainWeb3.eth.Contract(contract.abi, secondContractAddress);

    var forkedExample = new forkedWeb3.eth.Contract(contract.abi, secondContractAddress);

    // TODO: ugly workaround - not sure why this is necessary.
    if (!forkedExample._requestManager.provider) {
      forkedExample._requestManager.setProvider(forkedWeb3.eth._provider);
    }

    // This transaction happens entirely on the forked chain after forking.
    // It should be ignored by the main chain.
    await forkedExample.methods.setValue(800).send({ from: forkedAccounts[0] });
    // Let's assert the value was set correctly.
    const result = await forkedExample.methods.value().call({ from: forkedAccounts[0] });
    assert.strictEqual(parseInt(result, 10), 800);

    // Now lets check the value on the main chain. It shouldn't be 800.
    const mainResult = await example.methods.value().call({ from: mainAccounts[0] });
    assert.strictEqual(parseInt(mainResult, 10), 5);
  });

  it("should maintain a block number that includes new blocks PLUS the existing chain", async() => {
    // Note: The main provider should be at block 7 at this test. Reasoning:
    // - The forked chain has an initial block, which is block 0.
    // - The forked chain performed a transaction that produced a log, resulting in block 1.
    // - The forked chain had two transactions initially, resulting blocks 2 and 3.
    // - The main chain forked from there, creating its own initial block, block 4.
    // - Then the main chain deploy a contract, putting it at block 5.
    // - Then the main chain sent a transaction to that contract, block 6.
    // - Then the main chain performed a transaction, putting it at block 7.

    const result = await mainWeb3.eth.getBlockNumber();
    assert.strictEqual(mainWeb3.utils.hexToNumber(result), 7);

    // Now lets get a block that exists on the forked chain.
    const mainBlock = await mainWeb3.eth.getBlock(0);
    // And compare it to the forked chain's block
    const forkedBlock = await forkedWeb3.eth.getBlock(0);
    // Block hashes should be the same.
    assert.strictEqual(mainBlock.hash, forkedBlock.hash);

    // Now make sure we can get the block by hash as well.
    const mainBlockByHash = await mainWeb3.eth.getBlock(mainBlock.hash);
    assert.strictEqual(mainBlock.hash, mainBlockByHash.hash);
  });

  it("should have a genesis block whose parent is the last block from the forked provider", async() => {
    const forkedBlock = await forkedWeb3.eth.getBlock(forkBlockNumber);
    const parentHash = forkedBlock.hash;
    const mainGenesisNumber = mainWeb3.utils.hexToNumber(forkBlockNumber) + 1;
    const mainGenesis = await mainWeb3.eth.getBlock(mainGenesisNumber);
    assert.strictEqual(mainGenesis.parentHash, parentHash);
  });

  // Note: This test also puts a new contract on the forked chain, which is a good test.
  it(
    "should represent the block number correctly in the Oracle contract (oracle.blockhash0)," +
      " providing forked block hash and number",
    async() => {
      const { result: solcResult } = compile("./test/contracts/misc/", "Oracle");
      const oracleOutput = solcResult.contracts["Oracle.sol"].Oracle;

      const contract = new mainWeb3.eth.Contract(oracleOutput.abi);
      const deployTxn = contract.deploy({ data: oracleOutput.evm.bytecode.object });
      const oracle = await deployTxn.send({ from: mainAccounts[0], gas: 3141592 });

      const block = await mainWeb3.eth.getBlock(0);
      const blockhash = await oracle.methods.blockhash0().call();
      assert.strictEqual(blockhash, block.hash);

      const expectedNumber = await mainWeb3.eth.getBlockNumber();

      const number = await oracle.methods.currentBlock().call();
      assert.strictEqual(to.number(number), expectedNumber);

      await oracle.methods.setCurrentBlock().send({ from: mainAccounts[0], gas: 3141592 });
      const val = await oracle.methods.lastBlock().call({ from: mainAccounts[0] });
      assert.strictEqual(to.number(val), expectedNumber + 1);
    }
  ).timeout(10000);

  // TODO
  it("should be able to get logs across the fork boundary", async() => {
    const example = new mainWeb3.eth.Contract(contract.abi, contractAddress);
    const event = example.events.ValueSet({ fromBlock: 0, toBlock: "latest" });
    let callcount = 0;
    const eventData = new Promise((resolve, reject) => {
      event.on("data", function(log) {
        callcount++;
        if (callcount === 2) {
          event.removeAllListeners();
          resolve();
        }
      });
    });
    await eventData;
  }).timeout(30000);

  it("should return the correct nonce based on block number", async() => {
    // Note for the first two requests, we choose the block numbers 1 before and after the fork to
    // ensure we're pulling data off the correct provider in both cases.
    const [nonceBeforeFork, nonceAtFork, nonceLatestMain, nonceLatestFallback] = await Promise.all([
      mainWeb3.eth.getTransactionCount(forkedAccounts[0], forkBlockNumber - 1),
      mainWeb3.eth.getTransactionCount(forkedAccounts[0], forkBlockNumber + 1),
      mainWeb3.eth.getTransactionCount(forkedAccounts[0], "latest"),
      forkedWeb3.eth.getTransactionCount(forkedAccounts[0], "latest")
    ]);

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

  it("should return the correct balance based on block number", async() => {
    // Note for the first two requests, we choose the block numbers 1 before and after the fork to
    // ensure we're pulling data off the correct provider in both cases.
    const [balanceBeforeFork, balanceAfterFork, balanceLatestMain, balanceLatestFallback] = [
      ...(await Promise.all([
        mainWeb3.eth.getBalance(forkedAccounts[0], forkBlockNumber - 1),
        mainWeb3.eth.getBalance(forkedAccounts[0], forkBlockNumber + 1),
        mainWeb3.eth.getBalance(forkedAccounts[0], "latest"),
        forkedWeb3.eth.getBalance(forkedAccounts[0], "latest")
      ]))
    ].map(function(el) {
      return mainWeb3.utils.toBN(el);
    });

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

  it("should return the correct code based on block number", async() => {
    // This one is simpler than the previous two. Either the code exists or doesn't.
    const [codeEarliest, codeAfterFork, codeLatest] = [
      ...(await Promise.all([
        mainWeb3.eth.getCode(contractAddress, "earliest"),
        mainWeb3.eth.getCode(contractAddress, forkBlockNumber + 1),
        mainWeb3.eth.getCode(contractAddress, "latest")
      ]))
    ];

    // There should be no code initially.
    assert.strictEqual(codeEarliest, "0x");

    // Arbitrary length check since we can't assert the exact value
    assert(codeAfterFork.length > 20);
    assert(codeLatest.length > 20);

    // These should be the same since code can't change.
    assert.strictEqual(codeAfterFork, codeLatest);
  });

  it("should return transactions for blocks requested before the fork", async() => {
    const receipt = await forkedWeb3.eth.getTransactionReceipt(initialDeployTransactionHash);
    const referenceBlock = await forkedWeb3.eth.getBlock(receipt.blockNumber, true);
    const forkedBlock = await mainWeb3.eth.getBlock(receipt.blockNumber, true);
    assert.strictEqual(forkedBlock.transactions.length, referenceBlock.transactions.length);
    assert.deepStrictEqual(forkedBlock.transactions, referenceBlock.transactions);
  });

  it("should return a transaction for transactions made before the fork", async() => {
    const referenceTransaction = await forkedWeb3.eth.getTransaction(initialDeployTransactionHash);
    const forkedTransaction = await mainWeb3.eth.getTransaction(initialDeployTransactionHash);
    assert.deepStrictEqual(referenceTransaction, forkedTransaction);
  });

  it("should return a transaction receipt for transactions made before the fork", async() => {
    const referenceReceipt = await forkedWeb3.eth.getTransactionReceipt(initialDeployTransactionHash);
    assert.deepStrictEqual(referenceReceipt.transactionHash, initialDeployTransactionHash);

    const forkedReceipt = await mainWeb3.eth.getTransactionReceipt(initialDeployTransactionHash);
    assert.deepStrictEqual(forkedReceipt.transactionHash, initialDeployTransactionHash);
    assert.deepStrictEqual(referenceReceipt, forkedReceipt);
  });

  it("should return the same network version as the chain it forked from", async() => {
    const forkedNetwork = await forkedWeb3.eth.net.getId();
    const mainNetwork = await mainWeb3.eth.net.getId();
    assert.strictEqual(mainNetwork, forkedNetwork);
  });

  it("should be able to delete data", async() => {
    const from = mainAccounts[0];
    const example = new mainWeb3.eth.Contract(contract.abi, contractAddress);
    const example2 = new mainWeb3.eth.Contract(contract.abi, secondContractAddress);

    const example2value = await example2.methods.value().call();
    assert.strictEqual(example2value, "5");

    // delete the data from our fork
    await example.methods.setValue(0).send({ from });
    const result = await example.methods.value().call();
    assert.strictEqual(result, "0");

    // Check this hasn't clobbered data in the same slot in other contracts
    const example2valueAfter = await example2.methods.value().call();
    assert.strictEqual(example2valueAfter, "5");

    await example.methods.setValue(7).send({ from });
    const result2 = await example.methods.value().call();
    assert.strictEqual(result2, "7");
  });

  it("should be able to selfdestruct a contract", async() => {
    const from = mainAccounts[0];
    const example = new mainWeb3.eth.Contract(contract.abi, contractAddress);

    // delete the contract from our fork
    await example.methods.destruct().send({ from });
    const code = await mainWeb3.eth.getCode(contractAddress);
    assert.strictEqual(code, "0x");
  });

  it("should be able to send a signed transaction", async() => {
    const transaction = new Transaction({
      value: "0x10000000",
      gasLimit: "0x33450",
      from: mainAccounts[8],
      to: mainAccounts[7],
      nonce: "0x0"
    });

    const secretKey = mainWeb3.currentProvider.manager.state.accounts[mainAccounts[8].toLowerCase()].secretKey;
    transaction.sign(secretKey);

    const result = await mainWeb3.eth.sendSignedTransaction(transaction.serialize());
    assert.strictEqual(result.status, true);
  });

  describe("Can debug a transaction", function() {
    let send;
    before("generate send", function() {
      send = generateSend(mainWeb3.currentProvider);
    });

    // this test does NOT validate the state of the debugged transaction. It only checks that
    // the debug_traceTransaction is callable on a forked Chain. We don't yet have tests
    // for forked debug_traceTransaction, but when we do, they'll be in debug.js (or similar), not here.
    it("can debug the transaction", async function() {
      const receipt = await mainWeb3.eth.sendTransaction({ from: mainAccounts[0], to: mainAccounts[1], value: 1 });
      await assert.doesNotReject(send("debug_traceTransaction", receipt.transactionHash, []));
    });
  });

  describe("fork_block_number", function() {
    const initialValue = "123";
    let forkedExample;
    let forkBlockNumber;
    let web3;
    before("Set up the initial chain with the values we want to test", async function() {
      forkedExample = new forkedWeb3.eth.Contract(contract.abi, contractAddress);
      await forkedExample.methods.setValue(initialValue).send({ from: forkedAccounts[0] });
      forkBlockNumber = await forkedWeb3.eth.getBlockNumber();
      await forkedExample.methods.setValue("999").send({ from: forkedAccounts[0] });
    });

    before("create provider", function() {
      const provider = Ganache.provider({
        fork: forkedTargetUrl.replace("ws", "http"),
        fork_block_number: forkBlockNumber
      });
      web3 = new Web3(provider);
    });

    it("should create a provider who's initial block is immediately after the fork_block_number", async() => {
      const blockNumber = await web3.eth.getBlockNumber();
      // Because we (currently) mine a "genesis" block when forking, the current block immediately after
      // initialization is 1 higher than the fork_block_number. This may change in the future by:
      // https://github.com/trufflesuite/ganache-core/issues/341
      assert(blockNumber - 1, forkBlockNumber, "Initial block number on forked chain is not as expected");
    });

    it("should return original chain data from before the fork", async() => {
      const example = new web3.eth.Contract(contract.abi, contractAddress);
      const result = await example.methods.value().call({ from: mainAccounts[0] });

      assert(result, initialValue, "Value return on forked chain is not as expected");
    });
  });

  describe("Intra block state", function() {
    it("should be aware of the vm cache", async() => {
      const { result } = compile("./test/contracts/forking/", "IntraBlockCache");
      const contract = new mainWeb3.eth.Contract(result.contracts["IntraBlockCache.sol"].IntraBlockCache.abi);
      const accounts = await mainWeb3.eth.getAccounts();
      const ibc = await contract
        .deploy({
          data: result.contracts["IntraBlockCache.sol"].IntraBlockCache.evm.bytecode.object
        })
        .send({
          from: accounts[0],
          gas: 190941
        });
      return assert.doesNotReject(
        ibc.methods.deploy().send({ from: accounts[0] }),
        undefined,
        "Should reference state in the VM's cache"
      );
    });
  });

  after("Shutdown server", (done) => {
    forkedWeb3._provider.connection.close();
    forkedServer.close(function(serverCloseErr) {
      forkedWeb3.setProvider();
      const mainProvider = mainWeb3.currentProvider;
      mainWeb3.setProvider();
      mainProvider &&
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
