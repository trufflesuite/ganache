const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const { readFileSync } = require("fs");
const temp = require("temp").track();
const { compile } = require("solc");
const memdown = require("memdown");
const { join } = require("path");
const assert = require("assert");
const Web3 = require("web3");

// const Transaction = require("ethereumjs-tx");
// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

const source = readFileSync("./test/Example.sol", { encoding: "utf8" });
const result = compile(source, 1);

// Note: Certain properties of the following contract data are hardcoded to
// maintain repeatable tests. If you significantly change the solidity code,
// make sure to update the resulting contract data with the correct values.
const contract = {
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

const runTests = function(providerInit) {
  describe("Persistence ", function() {
    const web3 = new Web3();
    let accounts;
    let tx;
    let provider;

    before("init provider", function() {
      providerInit(function(p) {
        provider = p;
        web3.setProvider(p);
      });
    });

    before("Gather accounts", async function() {
      accounts = await web3.eth.getAccounts();
    });

    before("send transaction", async function() {
      tx = await web3.eth.sendTransaction({
        from: accounts[0],
        gas: "0x2fefd8",
        data: contract.binary
      });
    });

    it("should have block height 1", async function() {
      this.timeout(5000);
      let res = await web3.eth.getBlockNumber();
      assert(res === 1);
      // Close the first provider now that we've gotten where we need to be.
      // Note: we specifically close the provider so we can read from the same db.
      provider.close(() => null); // pass dummy fn to satisfy callback expectation
    });

    it("should reopen the provider", function() {
      providerInit(function(p) {
        provider = p;
        web3.setProvider(provider);
      });
    });

    it("should still be on block height 1", async function() {
      this.timeout(5000);
      const result = await web3.eth.getBlockNumber();
      assert(result === 1);
    });

    it("should still have block data for first block", async function() {
      await web3.eth.getBlock(1);
    });

    it("should have a receipt for the previous transaction", async function() {
      const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
      assert.notStrictEqual(receipt, null, "Receipt shouldn't be null!");
      assert.strictEqual(receipt.transactionHash, tx.transactionHash);
    });

    it("should maintain the balance of the original accounts", async function() {
      const balance = await web3.eth.getBalance(accounts[0]);
      assert(balance > 98);
    });
  });
};

const runRegressionTests = function(regressionProviderInit, memdbProviderInit) {
  describe("Verify previous db compatibility", function() {
    const web3 = new Web3();
    const memdbWeb3 = new Web3();
    const str = JSON.stringify;
    const blocks = [];
    const memdbBlocks = [];
    let blockHeight = 2;
    let memdbBlockHeight = 0;
    let accounts;
    // let tx;

    before("init provider", function() {
      regressionProviderInit(function(p) {
        web3.setProvider(p);
      });
      memdbProviderInit(function(p) {
        memdbWeb3.setProvider(p);
      });
    });

    before("Gather accounts", async function() {
      accounts = await web3.eth.getAccounts();
    });

    it("should have identical accounts (same mnemonic)", async function() {
      const memAccounts = await memdbWeb3.eth.getAccounts();
      assert.strictEqual(str(accounts), str(memAccounts), "accounts should be equal on both chains");
    });

    it(`should be on block height ${blockHeight} (db store)`, async function() {
      const result = await web3.eth.getBlockNumber();
      assert(result === blockHeight);
    });

    it("should be on block height 0 (mem store)", async function() {
      const result = await memdbWeb3.eth.getBlockNumber();
      assert(result === 0);
    });

    it("should issue/accept two tx's (mem store)", async function() {
      // Don't change the details of this tx - it's needed to deterministically match a manually created
      // DB with prior versions of ganache-core
      const txOptions = {
        from: accounts[0],
        to: accounts[1],
        value: 1
      };
      let receipt = memdbWeb3.eth.sendTransaction(txOptions);
      // send("evm_mine", )
      assert(receipt);
      assert.strictEqual(receipt.blockNumber, ++memdbBlockHeight);
      const receipt2 = await memdbWeb3.eth.sendTransaction(txOptions);
      assert(receipt2);
      assert.strictEqual(receipt2.blockNumber, ++memdbBlockHeight);
    });

    it("should be on block height 2 (mem store)", async function() {
      const result = await memdbWeb3.eth.getBlockNumber();
      assert(result === 2);
    });

    it("should produce identical blocks (persitant db - memdb)", async function() {
      blocks.push(await web3.eth.getBlock(0, true));
      blocks.push(await web3.eth.getBlock(1, true));
      blocks.push(await web3.eth.getBlock(2, true));
      memdbBlocks.push(await web3.eth.getBlock(0, true));
      memdbBlocks.push(await web3.eth.getBlock(1, true));
      memdbBlocks.push(await web3.eth.getBlock(2, true));
      // assert.strictEqual(str(block0), str(memDbBlock0));
      // assert.strictEqual(str(block1), str(memDbBlock1));
      // assert.strictEqual(str(block2), str(memDbBlock2));
    });

    it("should produce identical transactions (persitant db - memdb)", async function() {
      // const block1 = await web3.eth.getBlock(1);
      // const block2 = await web3.eth.getBlock(2);
      const block2 = await memdbWeb3.eth.getBlock(2, false);
      const block1 = await memdbWeb3.eth.getBlock(1, false);
      const tx1 = await web3.eth.getTransaction(block1.transactions[0]);
      const tx2 = await web3.eth.getTransaction(block2.transactions[0]);
      const memDbTx1 = await memdbWeb3.eth.getTransaction(block1.transactions[0]);
      const memDbTx2 = await memdbWeb3.eth.getTransaction(block2.transactions[0]);
      assert(tx1 && tx2 && memDbTx1 && memDbTx2);
      assert.strictEqual(str(tx1), str(memDbTx1));
      assert.strictEqual(str(tx2), str(memDbTx2));
    });
  });
};

var mnemonic = "debris electric learn dove warrior grow pistol carry either curve radio hidden";

const providerInitGen = function(opts) {
  return function(cb) {
    const provider = Ganache.provider(opts);
    cb(provider);
  };
};

describe("Default DB", function() {
  const dbPath = temp.mkdirSync("testrpc-db-");
  // initialize a persistent provider

  const providerInit = providerInitGen({
    db_path: dbPath,
    mnemonic
  });

  runTests(providerInit);
});

describe("Custom DB", function() {
  const db = memdown();

  // initialize a custom persistence provider
  const providerInit = providerInitGen({
    db,
    mnemonic
  });

  runTests(providerInit);
});

describe("Regression test DB", function() {
  // Don't change these options, we need these to match the saved chain in ./test/testdb
  const db = memdown();
  const dbPath = join(__dirname, "/testdb");
  const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
  const time = new Date("2009-01-03T18:15:05+00:00");
  const networkId = "1337";
  const blockTime = 1000; // An abundantly sufficient block time used with evm_mine for deterministic results

  // initialize a custom persistence provider
  const options = { mnemonic, network_id: networkId, time, blockTime };
  const dbOptions = Object.assign({}, options, { db_path: dbPath });
  const memdbOptions = Object.assign({}, options, { db });

  const dbProviderInit = providerInitGen(dbOptions);
  const memdbProviderInit = providerInitGen(memdbOptions);

  runRegressionTests(dbProviderInit, memdbProviderInit);
});
