import assert from "assert";
import getProvider from "../../helpers/getProvider";

describe("api", () => {
  describe("eth", () => {
    describe("eth_accounts", () => {
      it("should return the default number of accounts", async () => {
        const defaultAccounts = 10;
        const provider = await getProvider();
        const accounts = await provider.send("eth_accounts");
        assert.strictEqual(accounts.length, defaultAccounts);
        const opts = provider.getOptions();
        assert.strictEqual(opts.wallet.totalAccounts, defaultAccounts);
      });

      it("should return the custom number of accounts", async () => {
        const totalAccounts = 5;
        const provider = await getProvider({ wallet: { totalAccounts } });
        const accounts = await provider.send("eth_accounts");
        assert.strictEqual(accounts.length, totalAccounts);
        const opts = provider.getOptions();
        assert.strictEqual(totalAccounts, opts.wallet.totalAccounts);
      });

      it("should allow specifying 0 accounts", async () => {
        const totalAccounts = 0;
        const provider = await getProvider({ wallet: { totalAccounts } });
        const accounts = await provider.send("eth_accounts");
        assert.strictEqual(accounts.length, totalAccounts);
        const opts = provider.getOptions();
        assert.strictEqual(opts.wallet.totalAccounts, totalAccounts);
      });

      it("should allow initialization without accounts", async () => {
        const options = { wallet: { accounts: [] } };
        const provider = await getProvider(options);
        const accounts = await provider.send("eth_accounts");
        const opts = provider.getOptions();
        const initialAccounts = Object.keys(provider.getInitialAccounts());
        assert.strictEqual(accounts.length, 0);
        assert.strictEqual(opts.wallet.totalAccounts, 0);
        assert.strictEqual(opts.wallet.accounts.length, 0);
        assert.strictEqual(initialAccounts.length, 0);
      });
    });
  });
});
