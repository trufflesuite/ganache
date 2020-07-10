import assert from "assert";
import EthereumProvider from "../src/provider";
import getProvider from "./helpers/getProvider";
import JsonRpc from "@ganache/utils/src/things/jsonrpc";
import EthereumApi from "../src/api";

describe("provider", () => {
  describe("options", () => {
    it("generates predictable accounts when given a seed", async () => {
      const provider = await getProvider({seed: "temet nosce"});
      const accounts = await provider.send("eth_accounts");
      assert.strictEqual(accounts[0], "0x59eF313E6Ee26BaB6bcb1B5694e59613Debd88DA");
    });
  });

  describe("interface", () => {
    const network_id = "1234";
    let provider: EthereumProvider;

    beforeEach(async () => {
      provider = await getProvider({network_id});
    });

    it("returns things via EIP-1193", async () => {
      assert.strictEqual(await provider.send("net_version"), network_id);
    });

    it("returns things via legacy", async () => {
      const jsonRpcRequest: JsonRpc.Request<EthereumApi> = {
        id: "1",
        jsonrpc: "2.0",
        method: "net_version"
      };
      const methods = ["send", "sendAsync"] as const;
      return Promise.all(methods.map(method => {
        return new Promise((resolve, reject) => {
          provider[method](jsonRpcRequest, (err: Error, {result}): void => {
            if(err) return reject(err);
            assert.strictEqual(result, network_id);
            resolve();
          });
        });
      }).map(async prom => {
        assert.strictEqual(await prom, void 0);
      }));
    });
  });
});
