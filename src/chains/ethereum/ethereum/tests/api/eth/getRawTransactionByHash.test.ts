import assert from "assert";
import Transaction from "@ethereumjs/tx/dist/legacyTransaction";
import Common from "@ethereumjs/common";
import EthereumProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";

describe("api", () => {
  describe("eth", () => {
    describe.only("getRawTransactionByHash", () => {
      let provider: EthereumProvider;
      let tx;
      let txHash;
      const common = Common.forCustomChain(
        "mainnet",
        {
          name: "ganache",
          chainId: 1337,
          comment: "Local test network",
          bootstrapNodes: []
        },
        "petersburg"
      );

      before(async () => {
        provider = await getProvider();
        const [from, to] = await provider.send("eth_accounts", []);
        tx = {
          from,
          to
        };
        await provider.send("eth_subscribe", ["newHeads"]);
        txHash = await provider.send("eth_sendTransaction", [tx]);
        await provider.once("message");
      });

      it("should return the tx as a hex string", async () => {
        const rawTx = await provider.send("eth_getRawTransactionByHash", [
          txHash
        ]);
        assert.strictEqual(
          rawTx,
          "0xf86680847735940083015f9094c8879bccbe23ab4d188de4bbdc87b8992368f8b98080820a95a034dfad968bde79b31e360b1659d34172cd95e46248c86def51e3479ff09deb2aa01644668d0ea3ae5ce6ab3bb112c64b13c37dd2f5c2c7a217b586be591dbd2b06"
        );
      });
      it("should return null if the transaction hash can't be found", async () => {
        const invalidHash = txHash.concat("0");
        const rawTx = await provider.send("eth_getRawTransactionByHash", [
          invalidHash
        ]);
        assert.strictEqual(rawTx, null);
      });
    });
  });
});
