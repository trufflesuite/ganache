import assert from "assert";
import EthereumProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
const DEFAULT_DIFFICULTY = 1;
let provider: EthereumProvider;

describe("api", () => {
  describe("eth", () => {
    describe("getBlockByNumber", () => {
      describe("difficulty", () => {
        beforeEach(async () => {
          provider = await getProvider();
        });
        afterEach(async () => {
          provider && (await provider.disconnect());
        });

        it("returns the block difficulty", async () => {
          const block = await provider.send("eth_getBlockByNumber", ["latest"]);
          assert.strictEqual(
            block.difficulty,
            `0x${DEFAULT_DIFFICULTY.toString(16)}`
          );
        });
      });

      describe("totalDifficulty", () => {
        describe("when the default values are used", () => {
          beforeEach(async () => {
            provider = await getProvider();
          });
          afterEach(async () => {
            provider && (await provider.disconnect());
          });

          it("equals the block difficulty for the genesis block", async () => {
            const block = await provider.send("eth_getBlockByNumber", ["0x0"]);
            assert.strictEqual(
              block.totalDifficulty,
              `0x${DEFAULT_DIFFICULTY.toString(16)}`
            );
          });
          it("equals the sum of the difficulty of all blocks (hex)", async () => {
            const numberOfBlocksToMine = Math.floor(Math.random() * 10 + 1);
            await provider.send("evm_mine", [{ blocks: numberOfBlocksToMine }]);
            const block = await provider.send("eth_getBlockByNumber", [
              `0x${numberOfBlocksToMine.toString(16)}`
            ]);
            assert.strictEqual(
              block.totalDifficulty,
              `0x${((numberOfBlocksToMine + 1) * DEFAULT_DIFFICULTY).toString(
                16
              )}`
            );
          });
        });

        describe("when the difficulty is set manually", () => {
          let difficulty;
          beforeEach(async () => {
            difficulty = Math.floor(Math.random() * 9 + 1);
            provider = await getProvider({
              miner: { difficulty }
            });
          });
          afterEach(async () => {
            provider && (await provider.disconnect());
          });

          it("equals the block difficulty for the genesis block", async () => {
            const block = await provider.send("eth_getBlockByNumber", ["0x0"]);
            assert.strictEqual(
              block.totalDifficulty,
              `0x${difficulty.toString(16)}`
            );
          });
          it("equals the sum of the difficulty of all blocks (hex)", async () => {
            const numberOfBlocksToMine = Math.floor(Math.random() * 10 + 1);
            await provider.send("evm_mine", [{ blocks: numberOfBlocksToMine }]);
            const block = await provider.send("eth_getBlockByNumber", [
              `0x${numberOfBlocksToMine.toString(16)}`
            ]);
            assert.strictEqual(
              block.totalDifficulty,
              `0x${((numberOfBlocksToMine + 1) * difficulty).toString(16)}`
            );
          });
        });
      });
    });
  });
});
