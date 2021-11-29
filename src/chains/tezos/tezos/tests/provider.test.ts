import { JsonRpcRequest } from "@ganache/utils";
import assert from "assert";
import TezosApi from "../src/api";
import TezosProvider from "../src/provider";
import getProvider from "./helpers/getProvider";

describe("provider", () => {
  describe("options", () => {
    it("generates exact number of initial accounts", async () => {
      const provider = await getProvider({ wallet: { totalAccounts: 3 } });
      const accounts = await provider.send("tez_accounts", []);
      assert.strictEqual(accounts.length, 3);
    });
  });

  describe("interface", () => {
    let provider: TezosProvider;

    beforeEach(async () => {
      provider = await getProvider({ wallet: { totalAccounts: 3 } });
    });

    it("returns accounts", async () => {
      const accounts = await provider.send("tez_accounts");
      assert.strictEqual(accounts.length, 3);
    });
  });
});
