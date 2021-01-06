import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";
const { version } = require("../../../../../../packages/ganache/package.json");

describe("api", () => {
  describe("web3", () => {
    let provider: EthereumProvider;
    before(async () => {
      provider = await getProvider();
    });

    it("web3_clientVersion returns the client version", async () => {
      const result = await provider.send("web3_clientVersion");
      assert.deepStrictEqual(
        result,
        `Ganache/v${version}/EthereumJS TestRPC/v${version}/ethereum-js`
      );
    });

    it("web3_sha should hash the given input", async () => {
      const input = "Tim is a swell guy.";
      const result = await provider.send("web3_sha3", [input]);

      assert.strictEqual(
        result,
        "0xee80d4ac03202e2246d51a596c76a18e1a6d899bed9f05246d998fb656d9bd1f"
      );
    });
  });
});
