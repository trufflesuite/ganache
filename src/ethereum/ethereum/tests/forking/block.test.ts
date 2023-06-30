import assert from "assert";
import getProvider from "../helpers/getProvider";
import skipIfNoInfuraKey from "../helpers/skipIfNoInfuraKey";
import { EthereumProvider } from "../../src/provider";
import request from "superagent";

describe("forking", function () {
  this.timeout(10000);

  describe("blocks", () => {
    const blockNumber = 0xb77935;
    const blockNumHex = `0x${blockNumber.toString(16)}`;
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

    it("after initialization our latest block should be at fork.blockNumber + 1, parentHash should match", async () => {
      const res = await request.post(URL).send({
        jsonrpc: "2.0",
        id: "1",
        method: "eth_getBlockByNumber",
        params: [blockNumHex, true]
      });
      const remoteBlock = JSON.parse(res.text).result;
      const block = await provider.send("eth_getBlockByNumber", [
        "latest",
        true
      ]);
      assert.deepStrictEqual(parseInt(block.number), blockNumber + 1);
      assert.deepStrictEqual(block.parentHash, remoteBlock.hash);
    });

    it("after initialization our earliest block should be the fork earliest block, parentHash should match", async () => {
      const res = await request.post(URL).send({
        jsonrpc: "2.0",
        id: "1",
        method: "eth_getBlockByNumber",
        params: ["earliest", true]
      });
      const remoteBlock = JSON.parse(res.text).result;
      const block = await provider.send("eth_getBlockByNumber", [
        "earliest",
        true
      ]);
      assert.deepStrictEqual(
        parseInt(block.number),
        parseInt(remoteBlock.number)
      );
      assert.deepStrictEqual(block.hash, remoteBlock.hash);
    });

    //todo: reinstate this test after https://github.com/trufflesuite/ganache/issues/3616 is fixed
    it.skip("should get a block from the original chain", async () => {
      const res = await request.post(URL).send({
        jsonrpc: "2.0",
        id: "1",
        method: "eth_getBlockByNumber",
        params: [blockNumHex, true]
      });
      const remoteBlock = JSON.parse(res.text).result;

      const block = await provider.send("eth_getBlockByNumber", [
        blockNumHex,
        true
      ]);
      assert.deepStrictEqual(block, remoteBlock);
    });

    it("should get block 0 from the original chain", async () => {
      const req = await request.post(URL).send({
        jsonrpc: "2.0",
        id: "1",
        method: "eth_getBlockByNumber",
        params: ["0x0", true]
      });
      const block0 = JSON.parse(req.text).result;
      const block = await provider.send("eth_getBlockByNumber", ["0x0", true]);
      assert.deepStrictEqual(block, block0);
    });

    it("should get transaction count by hash from the original chain", async () => {
      const block = await provider.send("eth_getBlockByNumber", [
        "0xB443",
        true
      ]);
      const blockTransactionCountByHash = await provider.send(
        "eth_getBlockTransactionCountByHash",
        [block.hash]
      );
      assert.deepStrictEqual(
        block.transactions.length,
        parseInt(blockTransactionCountByHash)
      );
    });
  });
});
