import Ganache from "../index"
import assert from "assert";

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

  it("runs eth_call", async () => {
    const privateKey = Buffer.from("4646464646464646464646464646464646464646464646464646464646464646", "hex");
    const p = Ganache.provider({
      accounts: [{balance: "0x123", secretKey: "0x" + privateKey.toString("hex")}, {balance: "0x456"}]
    });
    const accounts = await p.send("eth_accounts");
    const result = await p.send("eth_call", [{from: accounts[0], to: accounts[0], value: "0x1"}]);
  });
});