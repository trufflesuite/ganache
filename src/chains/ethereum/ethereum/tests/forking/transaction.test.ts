import assert from "assert";
import getProvider from "../helpers/getProvider";
import skipIfNoInfuraKey from "../helpers/skipIfNoInfuraKey";
import { EthereumProvider } from "../../src/provider";
import request from "superagent";

describe("forking", () => {
  describe("transactions", function () {
    this.timeout(10000);

    const blockNumber = 0xcb6169;
    const URL = "https://mainnet.infura.io/v3/" + process.env.INFURA_KEY;
    let provider: EthereumProvider;

    skipIfNoInfuraKey();

    before(async () => {
      provider = await getProvider({
        fork: {
          url: URL,
          blockNumber,
          disableCache: true
        }
      });
    });

    it("should get a transaction from the original chain", async () => {
      // NOTE: we are using this specific transaction because it is a 1. type 2
      // that 2. uses the maxPriorityFeePerGas. This verifies that we are
      // correctly getting the effectiveGasPrice when we get the tx from the
      // fallback. Currently, if the effectiveGasPrice is not set when creating
      // the transaciton, it will default to maxFeePerGas. Then the miner,
      // who has the block info, resets the effectiveGasPrice. But for already
      // mined txs from the db (or in this case fork), we need to set that data
      // as `extra` in the tx.
      const txHash =
        "0xebab47c436cb1106e8f4d637d35aa4f21672db2b9b0f31bda42dd01cbf0e241c";
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
      assert.deepStrictEqual(tx, originalTx);
    });
  });
});
