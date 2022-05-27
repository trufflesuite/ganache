import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";

describe("api", () => {
  describe("bzz", () => {
    let provider: EthereumProvider;
    before(async function () {
      // GitHub Actions' windows-2019 Node v14 environment can sometimes take a
      // VERY long time to run this `before`, as it is CURRENTLY the first
      // @ganache/ethereum test that mocha runs (alphabetically)... and for some
      // reason it is slow.
      this.timeout(10000);

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
