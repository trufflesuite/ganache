import { WEI } from "@ganache/utils";
import os from "os";
import fs from "fs";
import assert from "assert";
import getProvider from "./helpers/getProvider";
import compile from "./helpers/compile";
import { join } from "path";

/**
 * test in here are playground tests or just tests that are in the original
 * ganache-core but have yet been properly ported over yet.
 */

describe("Random tests that are temporary!", () => {
  const expectedAddress = "0x604a95c9165bc95ae016a5299dd7d400dddbea9a";
  const mnemonic =
    "into trim cross then helmet popular suit hammer cart shrug oval student";

  it("should respect the BIP99 mnemonic", async () => {
    const options = { wallet: { mnemonic } };
    const p = await getProvider(options);
    const accounts = await p.send("eth_accounts");

    assert.strictEqual(accounts[0], expectedAddress);
  });

  it("eth_sendTransaction", async () => {
    const options = { wallet: { mnemonic } };
    const p = await getProvider(options);
    const accounts = await p.send("eth_accounts");
    const balance1_1 = await p.send("eth_getBalance", [accounts[1]]);
    await p.send("eth_subscribe", ["logs", {}]);
    await p.send("eth_subscribe", ["newHeads"]);
    await p.send("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: "0x1"
      }
    ]);
    await p.once("message");

    const balance1_2 = await p.send("eth_getBalance", [accounts[1]]);
    assert.strictEqual(parseInt(balance1_1) + 1, parseInt(balance1_2));
  });

  it("should create its own mnemonic", async () => {
    const p = await getProvider();
    const options = p.getOptions();
    assert.deepStrictEqual(typeof options.wallet.mnemonic, "string");
  });

  it("shouldn't allow initialization without accounts", async () => {
    let options = { wallet: { totalAccounts: 0 } } as any;
    await assert.rejects(getProvider(options), {
      message:
        "Cannot initialize chain: either options.accounts or options.total_accounts must be specified"
    });

    options = { wallet: { accounts: [] } };
    await assert.rejects(getProvider(options), {
      message:
        "Cannot initialize chain: either options.accounts or options.total_accounts must be specified"
    });
  });

  it("sets up accounts", async () => {
    const privateKey = Buffer.from(
      "4646464646464646464646464646464646464646464646464646464646464646",
      "hex"
    );
    const p = await getProvider({
      wallet: {
        accounts: [
          { balance: "0x123", secretKey: "0x" + privateKey.toString("hex") },
          { balance: "0x456" }
        ]
      }
    });
    const accounts = await p.send("eth_accounts");
    assert.strictEqual(accounts.length, 2);
  });

  it("sets errors when unlocked_accounts index is too high", async () => {
    await assert.rejects(getProvider({ wallet: { unlockedAccounts: [99] } }), {
      message: "Account at index 99 not found. Max index available is 9."
    });
  });

  it("sets errors when unlocked_accounts index is a (big) bigint", async () => {
    const bigNumber = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
    await assert.rejects(
      getProvider({
        wallet: {
          unlockedAccounts: [bigNumber.toString()]
        }
      }),
      {
        message: `Invalid value in wallet.unlockedAccounts: ${bigNumber}`
      }
    );
  });

  it("unlocks accounts via unlock_accounts (both string and numbered numbers)", async () => {
    const p = await getProvider({
      wallet: {
        mnemonic,
        secure: true,
        unlockedAccounts: ["0", 1]
      }
    });

    const accounts = await p.send("eth_accounts");
    const balance1_1 = await p.send("eth_getBalance", [accounts[1]]);
    const badSend = async () => {
      return p.send("eth_sendTransaction", [
        {
          from: accounts[2],
          to: accounts[1],
          value: "0x7b"
        }
      ]);
    };
    await assert.rejects(
      badSend,
      "Error: authentication needed: password or unlock"
    );

    await p.send("eth_subscribe", ["newHeads"]);
    await p.send("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: "0x7b"
      }
    ]);

    await p.once("message");

    const balance1_2 = await p.send("eth_getBalance", [accounts[1]]);
    assert.strictEqual(BigInt(balance1_1) + 123n, BigInt(balance1_2));

    const balance0_1 = await p.send("eth_getBalance", [accounts[0]]);

    await p.send("eth_sendTransaction", [
      {
        from: accounts[1],
        to: accounts[0],
        value: "0x7b"
      }
    ]);

    await p.once("message");

    const balance0_2 = await p.send("eth_getBalance", [accounts[0]]);
    assert.strictEqual(BigInt(balance0_1) + 123n, BigInt(balance0_2));
  });

  it("deploys contracts", async () => {
    const contract = compile(join(__dirname, "./contracts/HelloWorld.sol"));

    const p = await getProvider({
      miner: { defaultTransactionGasLimit: 6721975 }
    });
    const accounts = await p.send("eth_accounts");
    const from = accounts[3];

    await p.send("eth_subscribe", ["newHeads"]);

    const transactionHash = await p.send("eth_sendTransaction", [
      {
        from,
        data: contract.code
      }
    ]);

    await p.once("message");

    const receipt = await p.send("eth_getTransactionReceipt", [
      transactionHash
    ]);
    assert.strictEqual(receipt.blockNumber, "0x1");

    const to = receipt.contractAddress;
    const methods = contract.contract.evm.methodIdentifiers;

    const value = await p.send("eth_call", [
      { from, to, data: "0x" + methods["value()"] }
    ]);

    const x5 =
      "0x0000000000000000000000000000000000000000000000000000000000000005";
    assert.strictEqual(value, x5);

    const constVal = await p.send("eth_call", [
      { from, to, data: "0x" + methods["getConstVal()"] }
    ]);

    const x123 =
      "0x000000000000000000000000000000000000000000000000000000000000007b";
    assert.strictEqual(constVal, x123);

    const storage = await p.send("eth_getStorageAt", [
      receipt.contractAddress,
      "0x0",
      receipt.blockNumber
    ]);
    assert.strictEqual(storage, "0x05");

    const raw25 =
      "0000000000000000000000000000000000000000000000000000000000000019";
    const x25 = "0x" + raw25;
    const hash = await p.send("eth_sendTransaction", [
      { from, to, data: "0x" + methods["setValue(uint256)"] + raw25 }
    ]);
    await p.once("message");
    const txReceipt = await p.send("eth_getTransactionReceipt", [hash]);
    assert.strictEqual(txReceipt.blockNumber, "0x2");

    const getValueAgain = await p.send("eth_call", [
      { from, to, data: "0x" + methods["value()"] }
    ]);

    assert.strictEqual(getValueAgain, x25);

    const storage2 = await p.send("eth_getStorageAt", [
      receipt.contractAddress,
      "0x0",
      txReceipt.blockNumber
    ]);
    assert.strictEqual(storage2, "0x19");
  });

  it("transfers value", async () => {
    const p = await getProvider({ miner: { gasPrice: 0 } });
    const accounts = await p.send("eth_accounts");
    const ONE_ETHER = WEI;
    const options = p.getOptions();
    const startingBalance = BigInt(options.wallet.defaultBalance) * ONE_ETHER;
    await p.send("eth_subscribe", ["newHeads"]);
    await p.send("eth_sendTransaction", [
      {
        from: accounts[1],
        to: accounts[2],
        value: `0x${ONE_ETHER.toString(16)}`
      }
    ]);
    await p.once("message");

    const balances = (
      await Promise.all([
        p.send("eth_getBalance", [accounts[1]]),
        p.send("eth_getBalance", [accounts[2]])
      ])
    ).map(BigInt);
    assert.strictEqual(balances[0], startingBalance - ONE_ETHER);
    assert.strictEqual(balances[1], startingBalance + ONE_ETHER);
  });

  it("runs eth_call", async () => {
    const privateKey = Buffer.from(
      "4646464646464646464646464646464646464646464646464646464646464646",
      "hex"
    );
    const p = await getProvider({
      wallet: {
        accounts: [
          { balance: "0x123", secretKey: "0x" + privateKey.toString("hex") },
          { balance: "0x456" }
        ]
      }
    });
    const accounts = await p.send("eth_accounts");
    const result = await p.send("eth_call", [
      { from: accounts[0], to: accounts[0], value: "0x1" }
    ]);
    assert(result, "0x");
  });

  describe("options:account_keys_path", () => {
    const fileName = join(os.tmpdir(), "/ganache-core-test-accounts.json");

    function cleanUp() {
      try {
        fs.unlinkSync(fileName);
      } catch (e) {
        // ignore error
      }
    }
    afterEach("clean up", () => {
      cleanUp();
    });
    it("should create the file by name", async () => {
      await getProvider({ wallet: { accountKeysPath: fileName } });
      assert.strictEqual(
        fs.existsSync(fileName),
        true,
        "The account_keys file doesn't exist."
      );
    });
    it("should populate the file by descriptor", async () => {
      const fd = fs.openSync(fileName, "w");
      try {
        await getProvider({ wallet: { accountKeysPath: fd } });
        assert.strictEqual(
          fs.existsSync(fileName),
          true,
          "The account_keys file doesn't exist."
        );
      } finally {
        fs.closeSync(fd);
      }
    });
    afterEach("clean up", () => {
      cleanUp();
    });
  });
});
