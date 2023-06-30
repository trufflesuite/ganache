import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";

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
        `Ganache/vDEV/EthereumJS TestRPC/vDEV/ethereum-js`
      );
    });

    it("web3_sha should hash the given input", async () => {
      const input = Buffer.from("hello world", "utf-8").toString("hex");
      const result = await provider.send("web3_sha3", [`0x${input}`]);

      assert.strictEqual(
        result,
        "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad"
      );
    });
  });
});
