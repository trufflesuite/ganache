import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";

describe("api", () => {
  describe("db", () => {
    let provider: EthereumProvider;
    beforeEach(async () => {
      provider = await getProvider();
    });

    it("db_putString", async () => {
      const result = await provider.send("db_putString", ["", "", ""]);
      assert.deepStrictEqual(result, false);
    });

    it("db_getString", async () => {
      const result = await provider.send("db_getString", ["", ""]);
      assert.deepStrictEqual(result, "");
    });

    it("db_putHex", async () => {
      const result = await provider.send("db_putHex", ["", "", ""]);
      assert.deepStrictEqual(result, false);
    });

    it("db_getHex", async () => {
      const result = await provider.send("db_getHex", ["", ""]);
      assert.deepStrictEqual(result, "0x00");
    });
  });
});
