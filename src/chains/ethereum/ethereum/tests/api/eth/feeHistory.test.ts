// @ts-nocheck
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
const DEFAULT_DIFFICULTY = 1;
let provider: EthereumProvider;
import { Block } from "@ganache/ethereum-block";
import { Quantity } from "@ganache/utils";

async function sendTransaction(params) {
  const { provider, from, to, maxPriorityFeePerGas } = params;
  const tx = {
    from,
    to,
    value: "0x123",
    type: "0x2",
    maxPriorityFeePerGas
  } as any;
  return await provider.send("eth_sendTransaction", [tx]);
}
async function mineNBlocks(params) {
  const { provider, blocks } = params;
  return await provider.send("evm_mine", [
    {
      blocks
    }
  ]);
}

describe("api", () => {
  describe("eth", () => {
    describe("feeHistory", () => {
      let to, from;
      const genesisBlock = "0x0";
      const headerNotFoundBlock = "0x999999";
      const ERROR_HEADER_NOT_FOUND = "header not found";

      beforeEach(async () => {
        provider = await getProvider({
          miner: {
            blockTime: 100000
          }
        });
        [to, from] = await provider.send("eth_accounts");
        const blocks = 10;
        await mineNBlocks({ provider, blocks });
      });
      afterEach(async () => {
        provider && (await provider.disconnect());
      });

      describe("params", () => {
        describe("blockCount", () => {
          it("retrieves a range of valid blocks", async () => {
            const blockCount = "0x3";
            const newestBlock = "0xa";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, "0x8");
            assert.equal(feeHistory.baseFeePerGas.length, 4); // blockCount + 1
            assert.equal(feeHistory.gasUsedRatio.length, 3);
          });
          it("matches infura response for blockCount === 0", async () => {
            const blockCount = "0x0";
            const newestBlock = "0xa";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, "0x0");
            assert.equal(feeHistory.baseFeePerGas, undefined);
            assert.equal(feeHistory.gasUsedRatio, null);
            assert.equal(feeHistory.reward, undefined);
          });
          it("matches infura response for blockCount === 0 && newestBlock = 0x0", async () => {
            const blockCount = "0x0";
            const newestBlock = "0x0";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, "0x0");
            assert.equal(feeHistory.baseFeePerGas, undefined);
            assert.equal(feeHistory.gasUsedRatio, null);
            assert.equal(feeHistory.reward, undefined);
          });
          describe("newestBlock", () => {
            it("throws if header is not found", async () => {
              const blockCount = "0x1";
              await provider
                .send("eth_feeHistory", [blockCount, headerNotFoundBlock, []])
                .catch(e => {
                  assert.strictEqual(e.message, ERROR_HEADER_NOT_FOUND);
                });
            });
          });
          describe("rewardPercentile", () => {
            it("undefined if no percentiles given", async () => {
              const blockCount = "0x1";
              const newestBlock = "0x2";
              const feeHistory = await provider.send("eth_feeHistory", [
                blockCount,
                newestBlock,
                []
              ]);

              assert.equal(feeHistory.reward, undefined);
            });
          });
        });
      });
      describe("response", () => {
        describe("oldestBlock", () => {
          it("ignores blocks that do not exist (blockCount > newestBlock)", async () => {
            const blockCount = "0xa";
            const newestBlock = "0x2";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, genesisBlock);
            assert.equal(feeHistory.baseFeePerGas.length, 4); // blocks found + 1
            assert.equal(feeHistory.gasUsedRatio.length, 3);
          });
          it("newestBlock = oldestBlock when blockCount === 1", async () => {
            const blockCount = "0x1";
            const newestBlock = "0x2";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, newestBlock);
          });
          it("oldestBlock = newestBlock - blockCount +1", async () => {
            const blockCount = "0x1";
            const newestBlock = "0x2";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.equal(feeHistory.oldestBlock, newestBlock);
          });
        });
      });
      describe("gasUsedRatio", () => {
        it("returns 0 gasUsed for empty blocks", async () => {
          const blockCount = "0x1";
          const newestBlock = "0x2";
          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            []
          ]);

          assert.equal(feeHistory.gasUsedRatio[0], 0);
        });
        it("returns gasUsed / maxGas", async () => {
          await sendTransaction({ provider, to, from });

          const block = await provider.send("eth_getBlockByNumber", ["latest"]);

          const blockCount = "0x1";
          const newestBlock = block.number;

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            []
          ]);

          assert.equal(feeHistory.gasUsedRatio.length, 1);
          assert.equal(
            feeHistory.gasUsedRatio[0],
            Number(block.gasUsed) / Number(block.gasLimit)
          );
        });
        it("returns one entry for each block", async () => {
          await mineNBlocks({ provider, blocks: 1 });
          await sendTransaction({ provider, to, from });
          await mineNBlocks({ provider, blocks: 1 });
          const block = await provider.send("eth_getBlockByNumber", ["latest"]);

          const blockCount = "0x2";
          const newestBlock = block.number;

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            []
          ]);

          assert.equal(feeHistory.gasUsedRatio.length, 2);
          assert.equal(feeHistory.gasUsedRatio[0], 0);
          assert.equal(
            feeHistory.gasUsedRatio[1],
            Number(block.gasUsed) / Number(block.gasLimit)
          );
        });
      });
      describe("baseFeePerGas", () => {
        it("returns blockCount + 1 baseFeePerGas", async () => {
          const blockCount = "0x5";
          const blocks = 5;
          const newestBlock = "latest";
          await mineNBlocks({ provider, blocks });

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            []
          ]);

          assert.equal(feeHistory.baseFeePerGas.length, blocks + 1);
        });
        it("baseFeePerGas matches block baseFeePerGas", async () => {
          const blockCount = "0x5";
          const blocks = 5;
          const newestBlock = "latest";
          await mineNBlocks({ provider, blocks });

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            []
          ]);

          const block = await provider.send("eth_getBlockByNumber", [
            newestBlock
          ]);

          assert.equal(feeHistory.baseFeePerGas.length, blocks + 1);
          assert.equal(
            feeHistory.baseFeePerGas[blocks - 1],
            block.baseFeePerGas
          );
        });
        it("calculates the lastbaseFeePerGas based on the latest block", async () => {
          const blockCount = "0x5";
          const blocks = 5;
          const newestBlock = "latest";
          await mineNBlocks({ provider, blocks });

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            []
          ]);
          ``;
          const latestBlockFeePerGas = Number(
            feeHistory.baseFeePerGas[blocks - 1]
          );
          const pendingBlockFeePerGas = Number(
            feeHistory.baseFeePerGas[blocks]
          );
          const emptyBlockDelta = 0.875; // empty blocks will adjust down by 12.5%

          assert.equal(
            latestBlockFeePerGas * emptyBlockDelta,
            pendingBlockFeePerGas
          );
        });
      });
      describe("reward", () => {
        it("returns undefined if no reward is specified", async () => {
          const blockCount = "0x1";
          const newestBlock = "latest";

          await mineNBlocks({ provider, blocks: 5 });

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            []
          ]);

          assert.equal(feeHistory.reward, undefined);
        });
        it("returns 0x0 for empty blocks at each percentile", async () => {
          const blockCount = "0x1";
          const newestBlock = "latest";

          await mineNBlocks({ provider, blocks: 5 });

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            [10, 50, 80]
          ]);

          assert.deepEqual(feeHistory.reward, [["0x0", "0x0", "0x0"]]);
        });
        it("transactions with maxPriorityFeePerGas > effectiveGasReward", async () => {
          const blockCount = "0x1";
          const newestBlock = "latest";
          const txHash = await sendTransaction({
            provider,
            to,
            from
          });

          await mineNBlocks({ provider, blocks: 1 });

          const block = await provider.send("eth_getBlockByNumber", ["latest"]);
          const tx = await provider.send("eth_getTransactionByHash", [txHash]);

          //const maxPriorityFeePerGas = Number(tx.maxPriorityFeePerGas);
          const effectiveGasReward = tx.maxFeePerGas - block.baseFeePerGas;
          let reward = effectiveGasReward;
          /*
          if (maxPriorityFeePerGas < effectiveGasReward) {
            reward = tx.maxPriorityFeePerGas;
          }
          */

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            [10, 50, 80] // for one transaction, it will be the same for all
          ]);

          assert.deepEqual(feeHistory.reward, [[reward, reward, reward]]);
        });
        it("transactions with maxPriorityFeePerGas < effectiveGasReward", async () => {
          const blockCount = "0x1";
          const newestBlock = "latest";
          const pointOneGwei = "0x989680";
          const txHash = await sendTransaction({
            provider,
            to,
            from,
            maxPriorityFeePerGas: pointOneGwei
          });

          await mineNBlocks({ provider, blocks: 1 });

          const block = await provider.send("eth_getBlockByNumber", ["latest"]);
          const tx = await provider.send("eth_getTransactionByHash", [txHash]);
          const receipt = await provider.send("eth_getTransactionReceipt", [
            txHash
          ]);

          const maxPriorityFeePerGas = Number(tx.maxPriorityFeePerGas);
          const effectiveGasReward = tx.maxFeePerGas - block.baseFeePerGas;
          let reward; // = Quantity.from(effectiveGasReward).toString();
          if (maxPriorityFeePerGas < effectiveGasReward) {
            reward = tx.maxPriorityFeePerGas;
          }

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            [10, 50, 80] // for one transaction, it will be the same for all
          ]);

          assert.deepEqual(feeHistory.reward, [[reward, reward, reward]]);
        });
      });
    });
  });
});
