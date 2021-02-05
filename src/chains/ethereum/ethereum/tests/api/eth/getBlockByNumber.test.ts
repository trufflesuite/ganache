import assert from "assert";
import EthereumProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
const DEFAULT_DIFFICULTY = 1;

describe("api", () => {
  describe("eth", () => {
    describe("getBlockByNumber", () => {
      let provider: EthereumProvider;

      before(async () => {
        provider = await getProvider();
      });

      after(async () => {
        provider && (await provider.disconnect());
      });

      describe("difficulty", () => {
        it("returns the block difficulty", async () => {
          const block = await provider.send("eth_getBlockByNumber", ["latest"]);
          assert.strictEqual(block.difficulty, `0x${DEFAULT_DIFFICULTY}`);
        });
      });

      describe("totalDifficulty", () => {
        it("equals the block difficulty for the genesis block", async () => {
          const block = await provider.send("eth_getBlockByNumber", ["0x0"]);
          assert.strictEqual(block.totalDifficulty, `0x${DEFAULT_DIFFICULTY}`);
        });
      });
    });
  });
});
