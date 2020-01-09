import Ganache from "../index"
import assert from "assert";
const solc = require("solc");

function compileSolidity(source: string) {
  let result = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources: {
          "Contract.sol": {
            content: source
          }
        },
        settings: {
          outputSelection: {
            "*": {
              "*": ["*"]
            }
          }
        }
      })
    )
  );

  return Promise.resolve({
    code: "0x" + result.contracts["Contract.sol"].Example.evm.bytecode.object
  });
}

/**
 * test in here are playground tests or just tests that are in the original
 * ganache-core but have yet been properly ported over yet.
 */

describe("Accounts", () => {
  const expectedAddress = "0x604a95C9165Bc95aE016a5299dd7d400dDDBEa9A";
  const mnemonic = "into trim cross then helmet popular suit hammer cart shrug oval student";

  it("should respect the BIP99 mnemonic", async() => {
    const options = { mnemonic };
    const p = Ganache.provider(options);
    const accounts = await p.send("eth_accounts");

    assert.strictEqual(accounts[0], expectedAddress);
  });

  it("eth_sendTransaction", async() => {
    const options = { mnemonic };
    const p = Ganache.provider(options);
    const accounts = await p.send("eth_accounts");
    const balance1_1 = await p.send("eth_getBalance", [accounts[1]]);
    await p.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const balance1_2 = await p.send("eth_getBalance", [accounts[1]]);
    assert.strictEqual(parseInt(balance1_1) + 1, parseInt(balance1_2));
  });

  it("should create its own mnemonic", async() => {
    const p = Ganache.provider();
    const options = (p as any)[Object.getOwnPropertySymbols(p)[0] as any];
    assert.deepStrictEqual(typeof options.mnemonic, "string");
  });

  it("shouldn't allow initialization without accounts", async() => {
    const options = {total_accounts: 0} as any;
    assert.throws(()=>{ Ganache.provider(options); }, {
      message: "Cannot initialize chain: either options.accounts or options.total_accounts must be specified"
    });

    options.accounts = [] as any;
    assert.throws(()=>{ Ganache.provider(options); }, {
      message: "Cannot initialize chain: either options.accounts or options.total_accounts must be specified"
    });
  });

  it("sets up accounts", async () => {
    const privateKey = Buffer.from("4646464646464646464646464646464646464646464646464646464646464646", "hex");
    const p = Ganache.provider({
      accounts: [{balance: "0x123", secretKey: "0x" + privateKey.toString("hex")}, {balance: "0x456"}]
    });
    const accounts = await p.send("eth_accounts");
    assert.strictEqual(accounts.length, 2);
  });

  it("sets errors when unlocked_accounts index is too high", async () => {
    const ganacheInitFn = Ganache.provider.bind(Ganache, {
      unlocked_accounts: [99]
    });
    assert.throws(ganacheInitFn, {
      message: "Account at index 99 not found. Max index available is 9."
    });
  });

  it("sets errors when unlocked_accounts index is a (big) bigint", async () => {
    const bigNumber = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
    const ganacheInitFn = Ganache.provider.bind(Ganache, {
      unlocked_accounts: [bigNumber.toString()]
    });
    assert.throws(ganacheInitFn, {
      message: `Invalid value in unlocked_accounts: ${bigNumber}`
    });
  });

  it("unlocks accounts via unlock_accounts (both string and numbered numbers)", async () => {
    const p = Ganache.provider({
      locked: true,
      unlocked_accounts: ["0", 1]
    });
    
    const accounts = await p.send("eth_accounts");
    const balance1_1 = await p.send("eth_getBalance", [accounts[1]]);
    const badSend = () => {
      return p.send("eth_sendTransaction", [{
        from: accounts[2],
        to: accounts[1],
        value: 123
      }]);
    };
    await assert.rejects(badSend, "Error: signer account is locked");

    await p.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 123
    }]);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const balance1_2 = await p.send("eth_getBalance", [accounts[1]]);
    assert.strictEqual(BigInt(balance1_1) + 123n, BigInt(balance1_2));

    const balance0_1 = await p.send("eth_getBalance", [accounts[0]]);

    await p.send("eth_sendTransaction", [{
      from: accounts[1],
      to: accounts[0],
      value: 123
    }]);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const balance0_2 = await p.send("eth_getBalance", [accounts[0]]);
    assert.strictEqual(BigInt(balance0_1) + 123n, BigInt(balance0_2));
  });

  it.skip("deploys contracts", async () => {
    const contract = await compileSolidity("pragma solidity ^0.5.0; contract Example { event Event(); constructor() public { emit Event(); } }");
    const p = Ganache.provider();
    const accounts = await p.send("eth_accounts");
    const transactionHash = await p.send("eth_sendTransaction", [
      {
        from: accounts[0],
        data: contract.code
      }
    ]);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const result = await p.send("eth_getTransactionByHash", [transactionHash]);
    console.log(result);
  });

  it("runs eth_call", async () => {
    const privateKey = Buffer.from("4646464646464646464646464646464646464646464646464646464646464646", "hex");
    const p = Ganache.provider({
      accounts: [{balance: "0x123", secretKey: "0x" + privateKey.toString("hex")}, {balance: "0x456"}]
    });
    const accounts = await p.send("eth_accounts");
    const result = await p.send("eth_call", [{from: accounts[0], to: accounts[0], value: "0x1"}]);
    assert(true);
  });

  it.skip("eth_getStorageAt", async () => {
    const p = Ganache.provider();
    const accounts = await p.send("eth_accounts");
    await p.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const storage = await p.send("eth_getStorageAt", [accounts[0], 0]);
    console.log(storage)
  })
});
