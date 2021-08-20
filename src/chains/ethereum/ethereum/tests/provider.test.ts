import assert from "assert";
import EthereumProvider from "../src/provider";
import getProvider from "./helpers/getProvider";
import { JsonRpcRequest } from "@ganache/utils";
import EthereumApi from "../src/api";

describe("provider", () => {
  describe("options", () => {
    it("generates predictable accounts when given a seed", async () => {
      const provider = await getProvider({ wallet: { seed: "temet nosce" } });
      const accounts = await provider.send("eth_accounts");
      assert.strictEqual(
        accounts[0],
        "0x59ef313e6ee26bab6bcb1b5694e59613debd88da"
      );
    });

    it("errors when conflicting options are passed to the provider", async () => {
      assert.rejects(async () => {
        await getProvider({
          wallet: {
            deterministic: true,
            seed: "123"
          } as Object // "as Object" lets us get around ts typechecking during compilation
        });
      });
    });
  });

  describe("interface", () => {
    const networkId = 1234;
    let provider: EthereumProvider;

    beforeEach(async () => {
      provider = await getProvider({ chain: { networkId } });
    });

    it("returns things via EIP-1193", async () => {
      assert.strictEqual(await provider.send("net_version"), `${networkId}`);
    });

    it("returns things via legacy", async () => {
      const jsonRpcRequest: JsonRpcRequest<EthereumApi, "net_version"> = {
        id: "1",
        jsonrpc: "2.0",
        method: "net_version"
      };
      const methods = ["send", "sendAsync"] as const;
      return Promise.all(
        methods
          .map(method => {
            return new Promise((resolve, reject) => {
              provider[method](jsonRpcRequest, (err: Error, { result }) => {
                if (err) return reject(err);
                assert.strictEqual(result, `${networkId}`);
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
