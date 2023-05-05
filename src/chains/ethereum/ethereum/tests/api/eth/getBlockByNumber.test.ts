import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { Trie } from "@ethereumjs/trie";
import { Data } from "@ganache/utils";

const DEFAULT_DIFFICULTY = 1;
let provider: EthereumProvider;
const emptyTrieRoot = Data.toString(new Trie().root());

describe("api", () => {
  describe("eth", () => {
    describe("getBlockByNumber", () => {
      describe("difficulty", () => {
        beforeEach(async () => {
          provider = await getProvider(
            // the block difficulty changes after the merge, so we need rules
            // from before the merge
            { chain: { hardfork: "london" } }
          );
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
            provider = await getProvider(
              // the block difficulty changes after the merge, so we need rules
              // from before the merge
              { chain: { hardfork: "london" } }
            );
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
            assert(
              block,
              `\`block\` is \`null\`; didn't correctly mine ${numberOfBlocksToMine} blocks`
            );
            assert.strictEqual(
              block.totalDifficulty,
              `0x${((numberOfBlocksToMine + 1) * DEFAULT_DIFFICULTY).toString(
                16
              )}`,
              `Mined total difficulty, ${block.totalDifficulty} differs from sum of preceding block's difficulties.`
            );
          });
        });

        describe("when the difficulty is set manually", () => {
          let difficulty;
          beforeEach(async () => {
            difficulty = Math.floor(Math.random() * 9 + 1);
            provider = await getProvider({
              miner: { difficulty },
              // the block difficulty changes after the merge, so we need rules
              // from before the merge
              chain: { hardfork: "london" }
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
            assert(
              block,
              `\`block\` is \`null\`; didn't correctly mine ${numberOfBlocksToMine} blocks`
            );
            assert.strictEqual(
              block.totalDifficulty,
              `0x${((numberOfBlocksToMine + 1) * difficulty).toString(16)}`,
              `Mined total difficulty, ${block.totalDifficulty} differs from sum of preceding block's difficulties.`
            );
          });
        });
      });

      describe("shanghai", () => {
        beforeEach(async () => {
          provider = await getProvider({ chain: { hardfork: "shanghai" } });
        });
        afterEach(async () => {
          provider && (await provider.disconnect());
        });
        it("returns the withdrawals and withdrawalsRoot", async () => {
          const block = await provider.send("eth_getBlockByNumber", ["latest"]);
          // always an empty array when not forking (see the forking tests for
          // forked withdrawals)
          assert.deepStrictEqual(block.withdrawals, []);
          // always the empty tree root when there are no withdrawals
          assert.strictEqual(block.withdrawalsRoot, emptyTrieRoot);
        });
      });
    });
  });
});
