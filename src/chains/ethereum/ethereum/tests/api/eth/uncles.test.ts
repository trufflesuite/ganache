import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";

describe("api", () => {
  describe("eth", () => {
    describe("eth_getUncle*", () => {
      let provider: EthereumProvider;
      let accounts: string[];

      beforeEach(async () => {
        provider = await getProvider();
        accounts = await provider.send("eth_accounts");
      });

      it("eth_getUncleCountByBlockHash", async () => {
        await provider.send("eth_subscribe", ["newHeads"]);
        await provider.send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: accounts[1],
            value: "0x1"
          }
        ]);
        await provider.once("message");
        const block = await provider.send("eth_getBlockByNumber", ["0x1"]);

        const count = await provider.send("eth_getUncleCountByBlockHash", [
          block.hash
        ]);
        assert.strictEqual(count, "0x0");
      });

      it("eth_getUncleCountByBlockNumber", async () => {
        await provider.send("eth_subscribe", ["newHeads"]);
        await provider.send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: accounts[1],
            value: "0x1"
          }
        ]);
        await provider.once("message");

        const count = await provider.send("eth_getUncleCountByBlockNumber", [
          "0x1"
        ]);
        assert.strictEqual(count, "0x0");
      });

      it("eth_getUncleByBlockHashAndIndex", async () => {
        await provider.send("eth_subscribe", ["newHeads"]);
        await provider.send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: accounts[1],
            value: "0x1"
          }
        ]);
        await provider.once("message");
        const block = await provider.send("eth_getBlockByNumber", ["0x1"]);

        const result = await provider.send("eth_getUncleByBlockHashAndIndex", [
          block.hash,
          "0x0"
        ]);
        assert.deepStrictEqual(result, null);
      });

      it("eth_getUncleByBlockNumberAndIndex", async () => {
        await provider.send("eth_subscribe", ["newHeads"]);
        await provider.send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: accounts[1],
            value: "0x1"
          }
        ]);
        await provider.once("message");

        const result = await provider.send(
          "eth_getUncleByBlockNumberAndIndex",
          ["0x1", "0x0"]
        );
        assert.deepStrictEqual(result, null);
      });
    });
  });
});
