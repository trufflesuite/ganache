import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";

describe("api", () => {
  describe("bzz", () => {
    let provider: EthereumProvider;
    before(async function () {
      // GitHub Actions' windows-2019 Node v14 environment can sometimes take a
      // VERY long time to run this `before`, as it is CURRENTLY the first
      // @ganache/ethereum test that mocha runs (alphabetically)... and for some
      // reason it is slow.
      this.timeout(10000);

      // will this make GitHub Action's windwos-2019 Node v14 test work
      console.log("here a");
      console.log(Date.now());
      provider = await getProvider();
      console.log("here 0");
      console.log(Date.now());
    });

    it("bzz_hive stub returns value", async () => {
      console.log("here 1");
      const result = await provider.send("bzz_hive");
      console.log("here last");
      assert.deepStrictEqual(result, []);
    });

    it("bzz_info stub returns value", async () => {
      const result = await provider.send("bzz_info");
      assert.deepStrictEqual(result, []);
    });
  });
});
