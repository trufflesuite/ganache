import getProvider from "../../helpers/getProvider";
import assert from "assert";

describe("api", () => {
  describe("eth", () => {
    describe("eth_signTransaction", () => {
      it("signs a transaction that can then be submitted to the network", async () => {
        const provider = await getProvider();
        const [from, to] = await provider.send("eth_accounts");

        const signedTx = await provider.send("eth_signTransaction", [
          {
            from: from,
            to: to,
            gas: "0x5b8d80"
          }
        ]);

        await provider.send("eth_subscribe", ["newHeads"]);
        const txHash = await provider.send("eth_sendRawTransaction", [
          signedTx
        ]);
        await provider.once("message");

        const receipt = await provider.send("eth_getTransactionReceipt", [
          txHash
        ]);
        assert.strictEqual(receipt.transactionHash, txHash);
      });
    });
  });
});
