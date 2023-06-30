import assert from "assert";
import getProvider from "../helpers/getProvider";
import { EthereumProvider } from "../../src/provider";
import request from "superagent";
import skipIfNoInfuraKey from "../helpers/skipIfNoInfuraKey";

describe("forking", function () {
  this.timeout(10000);

  describe("accounts", function () {
    const accountAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const blockNumber = 0xb77935;
    const blockNumberHex = `0x${blockNumber.toString(16)}`;
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

    it("should get the balance from an account on the original chain", async () => {
      const [originalNonce, nonce] = await Promise.all([
        request
          .post(URL)
          .send({
            jsonrpc: "2.0",
            id: "1",
            method: "eth_getBalance",
            params: [accountAddress, blockNumberHex]
          })
          .then(req => JSON.parse(req.text).result),
        provider.send("eth_getBalance", [accountAddress, blockNumberHex])
      ]);

      assert.deepStrictEqual(originalNonce, nonce);
    });

    it("should get the transaction count from an account on the original chain", async () => {
      const [originalCount, count] = await Promise.all([
        request
          .post(URL)
          .send({
            jsonrpc: "2.0",
            id: "1",
            method: "eth_getTransactionCount",
            params: [accountAddress, blockNumberHex]
          })
          .then(req => JSON.parse(req.text).result),
        provider.send("eth_getTransactionCount", [
          accountAddress,
          blockNumberHex
        ])
      ]);

      assert.deepStrictEqual(originalCount, count);
    });

    it("should get the code from an account on the original chain", async () => {
      const [originalCode, code] = await Promise.all([
        request
          .post(URL)
          .send({
            jsonrpc: "2.0",
            id: "1",
            method: "eth_getCode",
            params: [accountAddress, blockNumberHex]
          })
          .then(req => JSON.parse(req.text).result),
        provider.send("eth_getCode", [accountAddress, blockNumberHex])
      ]);

      assert.deepStrictEqual(originalCode, code);
    });
  });
});
