import assert from "assert";
import getProvider from "../helpers/getProvider";
import EthereumProvider from "../../src/provider";

describe.only("forking", () => {
  describe("auth", () => {
    describe("Basic Authentication", () => {
      let provider: EthereumProvider;
      before(async function () {
        provider = await getProvider({
          fork: {
            url: "todo",
            jwt: "todo"
          }
        });
      });

      it("it doesn't crash", async () => {
        const result = await provider.send("eth_getBalance", [
          "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        ]);
        assert.deepStrictEqual(result, "0x0");
      }).timeout(0);
    });
  });
});
