import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";

describe("txpool", () => {
  describe("content", () => {
    let provider: EthereumProvider;
    let accounts: string[];
    beforeEach(async () => {
      provider = await getProvider({
        miner: { blockTime: 1000 }
      });
      accounts = await provider.send("eth_accounts");
    });

    it("returns the expected transaction data fields", async () => {
      let txJson = {
        from: accounts[1],
        to: accounts[2],
        value: "0x123",
        input: "0xaabbcc",
        gas: "0x10000",
        type: "0x2",
        maxPriorityFeePerGas: "0xf",
        maxFeePerGas: "0xffffffff"
      } as any;
      const hash = await provider.send("eth_sendTransaction", [txJson]);

      const { pending } = await provider.send("txpool_content");
      const txData = pending[accounts[1]]["0"];

      txJson["hash"] = hash;
      txJson["blockHash"] = null;
      txJson["blockNumber"] = null;
      txJson["transactionIndex"] = null;

      for (const [key, value] of Object.entries(txJson)) {
        assert.deepStrictEqual(value, txData[key]);
      }
    });

    it("handles pending transactions", async () => {
      const tx1 = await provider.send("eth_sendTransaction", [
        {
          from: accounts[1],
          to: accounts[2]
        }
      ]);
      const tx2 = await provider.send("eth_sendTransaction", [
        {
          from: accounts[2],
          to: accounts[3]
        }
      ]);
      const tx3 = await provider.send("eth_sendTransaction", [
        {
          from: accounts[1],
          to: accounts[2]
        }
      ]);

      const { pending } = await provider.send("txpool_content");
      assert.strictEqual(pending[accounts[1]]["0"].hash, tx1);
      assert.strictEqual(pending[accounts[1]]["1"].hash, tx3);
      assert.strictEqual(pending[accounts[2]]["0"].hash, tx2);
    });

    it("handles replaced transactions", async () => {
      const tx1 = await provider.send("eth_sendTransaction", [
        {
          from: accounts[1],
          to: accounts[2],
          value: "0x42",
          nonce: "0x0",
          type: "0x2",
          maxPriorityFeePerGas: "0xa0000000",
          maxFeePerGas: "0xa0000000"
        }
      ]);
      const tx2 = await provider.send("eth_sendTransaction", [
        {
          from: accounts[1],
          to: accounts[2],
          value: "0x4200",
          nonce: "0x0",
          type: "0x2",
          maxPriorityFeePerGas: "0xf0000000",
          maxFeePerGas: "0xf0000000"
        }
      ]);

      const { pending } = await provider.send("txpool_content");
      assert.strictEqual(pending[accounts[1]]["0"].hash, tx2);
      assert.strictEqual(pending[accounts[1]]["1"], undefined);
    });

    it("handles queued transactions", async () => {
      const tx = await provider.send("eth_sendTransaction", [
        {
          from: accounts[1],
          to: accounts[2],
          nonce: "0x123"
        }
      ]);

      const { queued } = await provider.send("txpool_content");
      assert.strictEqual(queued[accounts[1]]["291"].hash, tx);
    });

    it("does not return confirmed transactions", async () => {
      await provider.send("eth_subscribe", ["newHeads"]);
      await provider.send("eth_sendTransaction", [
        { from: accounts[1], to: accounts[2] }
      ]);
      await provider.send("evm_mine");
      await provider.once("message");

      const { pending, queued } = await provider.send("txpool_content");
      assert.deepStrictEqual(pending, {});
      assert.deepStrictEqual(queued, {});
    });
  });
});
