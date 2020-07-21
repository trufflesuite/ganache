
import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";

describe("api", () => {
  describe("eth", () => {
    describe("uncles", () => {
      let provider: EthereumProvider;
      beforeEach(async () => {
        provider = await getProvider();
      });

      it("eth_getUncleByBlockHashAndIndex", async () => {
        const result = await provider.send("eth_getUncleByBlockHashAndIndex");
        assert.deepStrictEqual(result, {})
      });
    });
  });
})