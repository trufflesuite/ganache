import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";

describe("api", () => {
  describe("shh", () => {
    let provider: EthereumProvider;
    before(async () => {
      provider = await getProvider();
    });

    it("returns it's shh_newIdentity status", async () => {
      const result = await provider.send("shh_newIdentity");
      assert.deepStrictEqual(result, "0x00");
    });

    it("returns it's shh_hasIdentity status", async () => {
      const result = await provider.send("shh_hasIdentity", ["0x0"]);
      assert.strictEqual(result, false);
    });

    it("returns false for shh_addToGroup", async () => {
      const result = await provider.send("shh_addToGroup", ["0x0"]);
      assert.strictEqual(result, false);
    });

    it("returns it's shh_newGroup status", async () => {
      const result = await provider.send("shh_newGroup");
      assert.deepStrictEqual(result, "0x00");
    });

    it("returns false for shh_newFilter", async () => {
      const result = await provider.send("shh_newFilter", ["0x0", []]);
      assert.strictEqual(result, false);
    });

    it("returns false for shh_uninstallFilter", async () => {
      const result = await provider.send("shh_uninstallFilter", ["0x0"]);
      assert.strictEqual(result, false);
    });

    it("returns []] for shh_getFilterChanges", async () => {
      const result = await provider.send("shh_getFilterChanges", ["0x0"]);
      assert.deepStrictEqual(result, []);
    });

    it("returns false for shh_getMessages", async () => {
      const result = await provider.send("shh_getMessages", ["0x0"]);
      assert.strictEqual(result, false);
    });

    it("returns false for shh_post", async () => {
      const result = await provider.send("shh_post", [{}]);
      assert.strictEqual(result, false);
    });

    it("returns 2 for shh_version", async () => {
      const result = await provider.send("shh_version");
      assert.strictEqual(result, "2");
    });
  });
});
