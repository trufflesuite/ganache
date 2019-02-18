const assert = require("assert");
const getWeb3 = require("../helpers/web3/getWeb3");

describe("Accounts", async() => {
  const expectedAddress = "0x604a95c9165bc95ae016a5299dd7d400dddbea9a";
  const badAddress = "0x1234567890123456789012345678901234567890";
  const mnemonic = "into trim cross then helmet popular suit hammer cart shrug oval student";

  it("should respect the BIP99 mnemonic", async() => {
    const options = { mnemonic };
    const { accounts } = await getWeb3(options);

    assert.strictEqual(accounts[0].toLowerCase(), expectedAddress);
  });

  it("should lock all accounts when specified", async() => {
    const options = {
      mnemonic: mnemonic,
      secure: true
    };
    const { accounts, web3 } = await getWeb3(options);

    accounts.forEach(async(account) => {
      try {
        await web3.eth.sendTransaction({
          from: account,
          to: badAddress,
          value: web3.utils.toWei("1", "ether"),
          gasLimit: 90000
        });
        assert.fail("signer account should be locked");
      } catch (error) {
        assert.strictEqual(error.message, "signer account is locked");
      }
    });
  });

  it("should unlock specified accounts, in conjunction with --secure", async() => {
    const options = {
      mnemonic,
      secure: true,
      unlocked_accounts: [expectedAddress]
    };

    const { accounts, web3 } = await getWeb3(options);

    accounts.forEach(async(account) => {
      if (account.toLowerCase() === expectedAddress) {
        await web3.eth.sendTransaction({
          from: account,
          to: badAddress,
          value: web3.utils.toWei("1", "ether"),
          gasLimit: 90000
        });
      } else {
        try {
          await web3.eth.sendTransaction({
            from: account,
            to: badAddress,
            value: web3.utils.toWei("1", "ether"),
            gasLimit: 90000
          });
          assert.fail("signer account should be locked");
        } catch (error) {
          assert.strictEqual(error.message, "signer account is locked");
        }
      }
    });
  });

  it("should unlock specified accounts, in conjunction with --secure, using array indexes", async() => {
    const index = 5;
    const options = {
      mnemonic,
      secure: true,
      unlocked_accounts: [index]
    };

    const { accounts, web3 } = await getWeb3(options);

    accounts.forEach(async(account) => {
      if (account === accounts[index]) {
        await web3.eth.sendTransaction({
          from: account,
          to: badAddress,
          value: web3.utils.toWei("1", "ether"),
          gasLimit: 90000
        });
      } else {
        try {
          await web3.eth.sendTransaction({
            from: account,
            to: badAddress,
            value: web3.utils.toWei("1", "ether"),
            gasLimit: 90000
          });
          assert.fail("signer accounts should be locked");
        } catch (error) {
          assert.strictEqual(error.message, "signer account is locked");
        }
      }
    });
  });

  it("should unlock accounts even if private key isn't managed by the testrpc (impersonation)", async() => {
    const options = {
      mnemonic,
      secure: true,
      unlocked_accounts: [0, badAddress]
    };

    const { web3 } = await getWeb3(options);

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

    if (typeof balanceInEther === "string") {
      balanceInEther = parseFloat(balanceInEther);
    } else {
      balanceInEther.toNumber();
    }

    // Can't check the balance exactly. It cost some ether to send the transaction.
    assert(balanceInEther > 4);
    assert(balanceInEther < 5);
  });

  it("errors when we try to sign a transaction from an account we're impersonating", async() => {
    const options = {
      mnemonic,
      secure: true,
      unlocked_accounts: [0, badAddress]
    };

    const { web3 } = await getWeb3(options);

    try {
      await web3.eth.sign("some data", badAddress);
      assert.fail("Expected an error while signing when not managing the private key");
    } catch (error) {
      assert(error.message.toLowerCase().indexOf("cannot sign data; no private key") >= 0);
    }
  });

  it("should create a 2 accounts when passing an object to provider", async() => {
    const options = {
      accounts: [{ balance: "0x12" }, { balance: "0x13" }]
    };

    const { accounts } = await getWeb3(options);

    assert.strictEqual(accounts.length, 2, "The number of accounts created should be 2");
  });

  it("should create a 7 accounts when ", async() => {
    const options = {
      total_accounts: 7
    };

    const { accounts } = await getWeb3(options);

    assert.strictEqual(accounts.length, 7, "The number of accounts created should be 7");
  });

  it("should respect the default_balance_ether option", async() => {
    const options = {
      default_balance_ether: 1.23456
    };

    const { accounts, web3 } = await getWeb3(options);

    accounts.forEach(async(account) => {
      const balance = await web3.eth.getBalance(account);
      const balanceInEther = await web3.utils.fromWei(balance, "Ether");
      assert.strictEqual(balanceInEther, "1.23456");
    });
  });
});
