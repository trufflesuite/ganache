import assert from "assert";
import Common from "ethereumjs-common";
import Transaction from "ethereumjs-tx/dist/transaction";
import EthereumProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";

describe("api", () => {
  describe("eth", () => {
    describe.only("getRawTransactionByHash", () => {
      let provider: EthereumProvider;
      let tx;
      let txHash;

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

      after(async () => {
        provider && (await provider.disconnect());
      });

      it("should return the tx as a hex string", async () => {
        const rawTx = await provider.send("eth_getRawTransactionByHash", [
          txHash
        ]);
        const common = new Common(1337, "muirGlacier");
        const t = new Transaction(rawTx, { common });
        console.log(t);
        assert.strictEqual(
          rawTx,
          "0xf86680847735940083015f9094c8879bccbe23ab4d188de4bbdc87b8992368f8b98080820a95a034dfad968bde79b31e360b1659d34172cd95e46248c86def51e3479ff09deb2aa01644668d0ea3ae5ce6ab3bb112c64b13c37dd2f5c2c7a217b586be591dbd2b06"
        );
      });
    });
  });
});
