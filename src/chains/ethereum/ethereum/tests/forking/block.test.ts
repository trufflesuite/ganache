import assert from "assert";
import getProvider from "../helpers/getProvider";
import EthereumProvider from "../../src/provider";
import request from "superagent";

describe("forking", () => {
  describe("auth", () => {
    describe("Blocks", () => {
      const URL = "//TODO";
      let provider: EthereumProvider;
      before(async function () {
        provider = await getProvider({
          fork: {
            url: URL
          }
        });
      });

      it("should get a block from the forked chain", async () => {
        const blocknum = "0xb77935";
        const res = await request.post(URL).send({
          jsonrpc: "2.0",
          id: "1",
          method: "eth_getBlockByNumber",
          params: [blocknum, true]
        });
        const { result } = JSON.parse(res.text);
        const block = await provider.send("eth_getBlockByNumber", [
          blocknum,
          true
        ]);
        assert.deepStrictEqual(block, result);
      });
    });
  });
});
