const assert = require("assert");
const initializeTestProvider = require("./helpers/web3/initializeTestProvider");

describe("Accounts", async() => {
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
        assert.rejects(
          async() => {
            await web3.eth.sendTransaction({
              from: account,
              to: badAddress,
              value: web3.utils.toWei("1", "ether"),
              gasLimit: 90000
            });
          },
          /signer account is locked/,
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
        if (account !== expectedAddress) {
          assert.rejects(
            async() => {
              await web3.eth.sendTransaction({
                from: account,
                to: badAddress,
                value: web3.utils.toWei("1", "ether"),
                gasLimit: 90000
              });
            },
            /signer account is locked/,
            "should not be able to unlock the count"
          );
        } else {
          assert.doesNotReject(
            async() => {
              await web3.eth.sendTransaction({
                from: account,
                to: badAddress,
                value: web3.utils.toWei("1", "ether"),
                gasLimit: 90000
              });
            },
            /signer account is locked/,
            "should not be able to unlock the count"
          );
        }
      })
    );
  });

  it("should unlock specified accounts, in conjunction with --secure, using array indexes", async() => {
    const index = 5;
    const options = {
      mnemonic,
      secure: true,
      unlocked_accounts: [index]
    };

    const { accounts, web3 } = await initializeTestProvider(options);

    await Promise.all(
      accounts.map((account) => {
        if (account !== accounts[index]) {
          assert.rejects(
            async() => {
              await web3.eth.sendTransaction({
                from: account,
                to: badAddress,
                value: web3.utils.toWei("1", "ether"),
                gasLimit: 90000
              });
            },
            /signer account is locked/,
            "should not be able to unlock the count"
          );
        } else {
          assert.doesNotReject(
            async() => {
              await web3.eth.sendTransaction({
                from: account,
                to: badAddress,
                value: web3.utils.toWei("1", "ether"),
                gasLimit: 90000
              });
            },
            /signer account is locked/,
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
      gasPrice: 0
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
    let balanceInEther = await web3.utils.fromWei(balance, "ether");
    balanceInEther = parseFloat(balanceInEther);
    assert.strictEqual(balanceInEther, 5);
  });

  it("errors when we try to sign a transaction from an account we're impersonating", async function() {
    const options = {
      mnemonic,
      secure: true,
      unlocked_accounts: [0, badAddress]
    };

    const { web3 } = await initializeTestProvider(options);

    assert.rejects(
      async() => {
        await web3.eth.sign("some data", badAddress);
      },
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
      accounts.map(async(account) => {
        const balance = await web3.eth.getBalance(account);
        const balanceInEther = web3.utils.fromWei(balance, "Ether");
        assert.strictEqual(balanceInEther, "1.23456");
      })
    );
  });
});
