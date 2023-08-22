import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";

describe("api", () => {
  describe("bzz", () => {
    let provider: EthereumProvider;
    before(async function () {
      provider = await getProvider();
    });

    it("bzz_hive stub returns value", async () => {
      const result = await provider.send("bzz_hive");
      assert.deepStrictEqual(result, []);
    });

    it("bzz_info stub returns value", async () => {
      const result = await provider.send("bzz_info");
      assert.deepStrictEqual(result, []);
    });
  });
});
