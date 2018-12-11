const Web3 = require("web3");
const Ganache = require("../index.js");
const assert = require("assert");
const pify = require("pify");
const BN = require("bn.js");
const temp = require("temp").track();

describe("Persistence ", function() {
  describe("simple value transfer transactions", function() {
    const dbPath = temp.mkdirSync("ganache-core-tests-");
    const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

    // use these to validate state
    let newProvider = null;
    let web3 = null;

    // initial state;
    let expectedLatestBlock = null;
    let expectedAccounts = null;
    let expectedNonces = null;
    let expectedBalances = null;

    before("Set up initial persisted blockchain", async function() {
      const initialProvider = Ganache.provider({
        db_path: dbPath,
        mnemonic
      });

      const initialWeb3 = new Web3(initialProvider);

      expectedAccounts = await initialWeb3.eth.getAccounts();

      // we send 1 ether to get some state on the chain
      const receipt = await initialWeb3.eth.sendTransaction({
        from: expectedAccounts[0],
        to: expectedAccounts[1],
        value: initialWeb3.utils.toWei("1", "ether")
      });

      assert.strictEqual(receipt.status, true);

      expectedLatestBlock = await initialWeb3.eth.getBlock("latest", true);

      expectedNonces = expectedAccounts.map(async(account) => initialWeb3.eth.getTransactionCount(account));

      expectedBalances = expectedAccounts.map(async(account) => initialWeb3.eth.getBalance(account));

      // clean up after ourselves to make sure we don't have any lingering background tasks
      initialWeb3.setProvider(null);
      await pify(initialProvider.close)();
    });

    before("Open new provider using state persisted by last chain", async function() {
      newProvider = Ganache.provider({
        db_path: dbPath,
        mnemonic
      });

      web3 = new Web3(newProvider);
    });

    it("should have the same latestBlock", async function() {
      const latestBlock = await web3.eth.getBlock("latest", true);
      assert.deepStrictEqual(latestBlock, expectedLatestBlock);
    });

    it("should have the same accounts", async function() {
      const accounts = await web3.eth.getAccounts();
      assert.deepStrictEqual(accounts, expectedAccounts);
    });

    it("should have the same nonces for known accounts", async function() {
      const nonces = expectedAccounts.map(async(account) => web3.eth.getTransactionCount(account));
      assert.deepStrictEqual(nonces, expectedNonces);
    });

    it("should have the same balances for known accounts", async function() {
      const balances = expectedAccounts.map(async(account) => web3.eth.getBalance(account));
      assert.deepStrictEqual(balances, expectedBalances);
    });

    it("should have a lower balance for account 0 as compared to account 1", async function() {
      const acct0Balance = await web3.eth.getBalance(expectedAccounts[0]);
      const acct1Balance = await web3.eth.getBalance(expectedAccounts[1]);

      assert(new BN(acct0Balance).lt(new BN(acct1Balance)));
    });

    it("should allow further simple value transactions with the same accounts", async function() {
      const account0InitialBalance = new BN(await web3.eth.getBalance(expectedAccounts[0]));
      const account1InitialBalance = new BN(await web3.eth.getBalance(expectedAccounts[1]));

      // returns BN because we pass a BN
      const value = web3.utils.toWei(new BN(1), "ether");

      // first, send the transaction
      const receipt = await web3.eth.sendTransaction({
        from: expectedAccounts[0],
        to: expectedAccounts[1],
        value: web3.utils.toWei("1", "ether")
      });

      assert.strictEqual(receipt.status, true);

      const txData = await web3.eth.getTransaction(receipt.transactionHash);
      const gasPrice = new BN(txData.gasPrice);
      const gasUsed = new BN(receipt.gasUsed);

      const gasCost = gasUsed.mul(gasPrice);

      const expectedAccount0FinalBalance = account0InitialBalance.sub(value).sub(gasCost);
      const expectedAccount1FinalBalance = account1InitialBalance.add(value);

      const account0FinalBalance = new BN(await web3.eth.getBalance(expectedAccounts[0]));
      const account1FinalBalance = new BN(await web3.eth.getBalance(expectedAccounts[1]));

      assert(
        account0FinalBalance.eq(expectedAccount0FinalBalance),
        "Account 0 final balance doesn't match expected final balance"
      );
      assert(
        account1FinalBalance.eq(expectedAccount1FinalBalance),
        "Account 1 final balance doesn't match expected final balance"
      );
    });
  });
});
