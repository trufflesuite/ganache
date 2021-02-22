import { JsonRpcTypes } from "@ganache/utils";
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
      const jsonRpcRequest: JsonRpcTypes.Request<TezosApi> = {
        id: "1",
        jsonrpc: "2.0",
        method: "tez_accounts"
      };
      const methods = ["send"] as const;
      return Promise.all(
        methods
          .map(method => {
            return new Promise((resolve, reject) => {
              provider[method](jsonRpcRequest, (err: Error, { result }) => {
                if (err) return reject(err);
                assert.strictEqual(result.length, 3);
                resolve(void 0);
              });
            });
          })
          .map(async prom => {
            assert.strictEqual(await prom, void 0);
          })
      );
    });
  });
});
