import assert from "assert";
import getProvider from "../helpers/getProvider";
import EthereumProvider from "../../src/provider";
import request from "superagent";

describe("forking", () => {
  describe("transactions", () => {
    const blockNumber = 0xb77935;
    const URL = "https://mainnet.infura.io/v3/" + process.env.INFURA_KEY;
    let provider: EthereumProvider;
    before(async function () {
      if (!process.env.INFURA_KEY) {
        this.skip();
      }
      provider = await getProvider({
        fork: {
          url: URL,
          blockNumber
        }
      });
    });

    it("should get a transaction from the original chain", async () => {
      const txHash =
        "0x36833194e25e1c74482ac34dab72229f2469360daef53282b4eff0df9166c152";
      const [originalTx, tx] = await Promise.all([
        request
          .post(URL)
          .send({
            jsonrpc: "2.0",
            id: "1",
            method: "eth_getTransactionByHash",
            params: [txHash]
          })
          .then(req => JSON.parse(req.text).result),
        provider.send("eth_getTransactionByHash", [txHash])
      ]);

      delete originalTx.type;

      assert.deepStrictEqual(tx, originalTx);
    });
  });
});
