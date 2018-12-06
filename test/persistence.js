const Web3 = require("web3");
const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const assert = require("assert");
const temp = require("temp").track();
const { readFileSync } = require("fs");
const { compile } = require("solc");
const memdown = require("memdown");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

const source = readFileSync("./test/Example.sol", { encoding: "utf8" });
const result = compile(source, 1);
let provider;

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
    let accounts;
    let tx;
    let provider;
    let memProvider;

    before("init provider", function() {
      regressionProviderInit(function(p) {
        provider = p;
        web3.setProvider(p);
      });
      memdbProviderInit(function(p) {
        memProvider = p;
        memdbWeb3.setProvider(p);
      });
    });

    before("Gather accounts", async function() {
      this.timeout(5000);
      accounts = await web3.eth.getAccounts();
    });

    it("should have identical accounts (same mnemonic)", async function() {
      const memAccounts = await web3.eth.getAccounts();
      assert.strictEqual(accounts, memAccounts, "accounts should be equal on both chains");
    });

    it("should be on block height 2 (db store)", async function() {
      this.timeout(5000);
      const result = await web3.eth.getBlockNumber();
      assert(result === 2);
    });
    
    it("should be on block height 0 (mem store)", async function() {
      this.timeout(5000);
      const result = await memdbWeb3.eth.getBlockNumber();
      assert(result === 0);
    });

    it("should be on block height 2 (mem store)", async function() {
      this.timeout(5000);
      const result = await memdbWeb3.eth.getBlockNumber();
      assert(result === 2);
    });
  });
}

var mnemonic = "debris electric learn dove warrior grow pistol carry either curve radio hidden";

describe("Default DB", function() {
  const dbPath = temp.mkdirSync("testrpc-db-");
  // initialize a persistent provider

  const providerInit = function(cb) {
    provider = Ganache.provider({
      db_path: dbPath,
      mnemonic
    });

    cb(provider);
  };

  runTests(providerInit);
});

describe("Custom DB", function() {
  const db = memdown();

  // initialize a custom persistence provider
  const providerInit = function(cb) {
    provider = Ganache.provider({
      db,
      mnemonic
    });

    cb(provider);
  };

  runTests(providerInit);
});

describe.only("Regression test DB", function() {
  const memdb = memdown();
  const db = `${__dirname}/testdb`;
  const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
  const i = "1337";
  const time = new Date("2009-01-03T18:15:05+00:00");
  const b = 1000;

  // initialize a custom persistence provider
  const dboptions = {
    db,
    mnemonic,
    i,
    time,
    b
  };
  const memdbOptions = Object.assign({}, dboptions, {db: memdb});

  const providerInitGen = function (opts) {
    return function(cb) {
      provider = Ganache.provider(opts);
      cb(provider);
    };
  }
  

  runRegressionTests(providerInitGen(dboptions), providerInitGen(memdbOptions));
});
