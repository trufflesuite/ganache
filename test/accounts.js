const assert = require("assert");
const initializeTestProvider = require("./helpers/web3/initializeTestProvider");
const { BN } = require("ethereumjs-util");
var Ganache = require("../../ganache-core/src/packages/core/lib/index.js").default;
const genSend = require("./helpers/utils/rpc");

describe("Accounts", () => {
  const expectedAddress = "0x604a95C9165Bc95aE016a5299dd7d400dDDBEa9A";
  const badAddress = "0x1234567890123456789012345678901234567890";
  const mnemonic = "into trim cross then helmet popular suit hammer cart shrug oval student";

  it("should respect the BIP99 mnemonic", async() => {
    const options = { mnemonic };
    const { accounts } = await initializeTestProvider(options);

    assert.strictEqual(accounts[0], expectedAddress);
  });

  it("should lock all accounts when specified", async() => {
    const options = {
      mnemonic,
      secure: true
    };

    const { accounts, web3 } = await initializeTestProvider(options);

    await Promise.all(
      accounts.map((account) => {
        const tx = web3.eth.sendTransaction({
          from: account,
          to: badAddress,
          value: web3.utils.toWei("1", "ether"),
          gasLimit: 90000
        });
        return assert.rejects(
          tx,
          /authentication needed: passphrase or unlock/,
          "should not be able to unlock the count"
        );
      })
    );
  });

  it("should unlock specified accounts, in conjunction with --secure", async() => {
    const options = {
      mnemonic,
      secure: true,
      unlocked_accounts: [expectedAddress]
    };

    const { accounts, web3 } = await initializeTestProvider(options);

    await Promise.all(
      accounts.map((account) => {
        const tx = web3.eth.sendTransaction({
          from: account,
          to: badAddress,
          value: web3.utils.toWei("1", "ether"),
          gasLimit: 90000
        });

        if (account === expectedAddress) {
          return assert.doesNotReject(
            tx,
            /authentication needed: passphrase or unlock/,
            "should not be able to unlock the count"
          );
        } else {
          return assert.rejects(
            tx,
            /authentication needed: passphrase or unlock/,
            "should not be able to unlock the count"
          );
        }
      })
    );
  });

  it("should unlock specified accounts, in conjunction with --secure, using array indexes", async() => {
    const accountIndexToUnlock = 5;
    const options = {
      mnemonic,
      secure: true,
      unlocked_accounts: [accountIndexToUnlock]
    };

    const { accounts, web3 } = await initializeTestProvider(options);
    const unlockedAccount = accounts[accountIndexToUnlock];

    await Promise.all(
      accounts.map((account) => {
        const tx = web3.eth.sendTransaction({
          from: account,
          to: badAddress,
          value: web3.utils.toWei("1", "ether"),
          gasLimit: 90000
        });

        if (account === unlockedAccount) {
          return assert.doesNotReject(
            tx,
            /authentication needed: passphrase or unlock/,
            "should not be able to unlock the count"
          );
        } else {
          return assert.rejects(
            tx,
            /authentication needed: passphrase or unlock/,
            "should not be able to unlock the count"
          );
        }
      })
    );
  });

  it("should unlock accounts even if private key isn't managed by the testrpc (impersonation)", async() => {
    const options = {
      mnemonic,
      secure: true,
      unlocked_accounts: [0, badAddress],
      gasPrice: 0,
      hardfork: "berlin"
    };

    const { web3 } = await initializeTestProvider(options);

    // Set up: give second address some ether
    await web3.eth.sendTransaction({
      from: expectedAddress,
      to: badAddress,
      value: web3.utils.toWei("10", "ether"),
      gasLimit: 90000
    });

    // Now we should be able to send a transaction from second address without issue.
    await web3.eth.sendTransaction({
      from: badAddress,
      to: expectedAddress,
      value: web3.utils.toWei("5", "ether"),
      gasLimit: 90000
    });

    // And for the heck of it let's check the balance just to make sure it went through
    const balance = await web3.eth.getBalance(badAddress);
    let balanceInEther = web3.utils.fromWei(balance, "ether");
    balanceInEther = parseFloat(balanceInEther);
    assert.strictEqual(balanceInEther, 5);
  });

  // in ganache v7 we don't treat this as an error: https://github.com/trufflesuite/ganache/issues/1660
  it.skip("errors when we try to sign a transaction from an account we're impersonating", async function() {
    const options = {
      mnemonic,
      secure: true,
      unlocked_accounts: [0, badAddress]
    };

    const { web3 } = await initializeTestProvider(options);

    assert.rejects(
      () => web3.eth.sign("some data", badAddress),
      /cannot sign data; no private key/,
      "should not be able to sign a transaction with an impersonated account"
    );
  });

  it("should create a 2 accounts when passing an object to provider", async() => {
    const options = {
      accounts: [{ balance: "0x12" }, { balance: "0x13" }]
    };

    const { accounts } = await initializeTestProvider(options);

    assert.strictEqual(accounts.length, 2, "The number of accounts created should be 2");
  });

  it("should create the correct number of accounts as specified by total_accounts", async() => {
    const options = {
      total_accounts: 7
    };

    const { accounts } = await initializeTestProvider(options);

    assert.strictEqual(accounts.length, 7, "The number of accounts created should be 7");
  });

  it("should respect the default_balance_ether option", async() => {
    const options = {
      default_balance_ether: 1.23456
    };

    const { accounts, web3 } = await initializeTestProvider(options);

    await Promise.all(
      accounts.map((account) =>
        web3.eth.getBalance(account).then((balance) => {
          const balanceInEther = web3.utils.fromWei(balance, "Ether");
          assert.strictEqual(balanceInEther, "1.23456");
        })
      )
    );
  });

  describe("Should handle large nonces", function() {
    let provider;
    let accounts;
    let from;
    let send;
    let currentNonce;
    let startingBlockNumber;
    const sendTransaction = (payload) => send("eth_sendTransaction", payload);
    const getTransactionByHash = (payload) => send("eth_getTransactionByHash", payload);

    beforeEach("set up provider", async function() {
      provider = Ganache.provider({ gasLimit: 6721975, instamine: "eager", vmErrorsOnRPCResponse: true });
      send = genSend(provider);
      const { result: _accounts } = await send("eth_accounts");
      accounts = _accounts;
      from = accounts[9];
    });

    async function setUp(initialNonce) {
      await send("evm_setAccountNonce", from, "0x" + initialNonce.toString(16));

      const { result: count } = await send("eth_getTransactionCount", from, "latest");
      currentNonce = new BN(count.slice(2), "hex");
      assert.strictEqual(currentNonce.toNumber(), initialNonce, "nonce is not equal to" + initialNonce);
      const {
        result: { number: blockNumber }
      } = await send("eth_getBlockByNumber", "latest", false);
      startingBlockNumber = parseInt(blockNumber, 16);
      assert.strictEqual(startingBlockNumber, 1, "latest block number is not expected (1)");
    }

    async function runTests(intervalMining = true) {
      const expectedNonce = new BN(currentNonce);
      let expectedBlockNum = startingBlockNumber + 1;

      if (intervalMining) {
        // mimic interval mining without out having to actually
        // configure ganache to mine on an interval (slowing tests down)
        // by just stopping the miner and then mining on command
        await send("miner_stop");
      }
      // create some transactions that will increment the nonce
      const tx = { value: 1, from, to: from };
      // send all our transactions and get their tx info once ready
      const pendingHashes = Array(3)
        .fill(tx)
        .map(sendTransaction);
      if (intervalMining) {
        await Promise.all(pendingHashes);
        await send("evm_mine");
      }
      const pendingTransactions = pendingHashes.map((tx) => tx.then(({ result }) => getTransactionByHash(result)));
      await Promise.all(
        pendingTransactions.map((tx) =>
          tx.then(({ result }) => {
            const nonce = new BN(result.nonce.slice(2), "hex");
            const blockNum = parseInt(result.blockNumber, 16);
            assert.strictEqual(nonce.toString(10), expectedNonce.toString(10), "Tx nonce is not as expected");
            assert.strictEqual(blockNum, expectedBlockNum, "Tx blockNumber is not as expected");
            expectedNonce.iaddn(1);
            // the block number must be different for each treansaction is we
            // we are instamining. This ensures we are testing the right code branch
            if (!intervalMining) {
              expectedBlockNum++;
            }
          })
        )
      );
    }

    it("should handle nonces greater than 255 (interval)", async function() {
      await setUp(255);
      await runTests(true);
    });

    it("should handle nonces greater than 255 (instamining)", async function() {
      await setUp(255);
      await runTests(false);
    });

    it("should handle nonces greater than MAX_SAFE_INTEGER (interval)", async function() {
      await setUp(Number.MAX_SAFE_INTEGER);
      await runTests(true);
    });

    it("should handle nonces greater than MAX_SAFE_INTEGER (instamining)", async function() {
      await setUp(Number.MAX_SAFE_INTEGER);
      await runTests(false);
    });
  });
});
