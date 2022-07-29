// @ts-nocheck
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { Quantity } from "@ganache/utils";
let provider: EthereumProvider;
const oneGwei = Quantity.Gwei.toString();
const twoGwei = Quantity.from(2e9).toString();
const threeGwei = Quantity.from(3e9).toString();
const fourGwei = Quantity.from(4e9).toString();

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
async function sendLegacyTransaction(params) {
  const { provider, from, to, gasPrice } = params;
  const tx = {
    from,
    to,
    value: "0x123",
    gasPrice
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

          it("returns empty result for blockCount === 0 && newestBlock = 0x0", async () => {
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
            it("returns undefined if no percentiles are given", async () => {
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
        it("transaction with maxPriorityFeePerGas > effectiveGasReward", async () => {
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

          const effectiveGasReward = tx.maxFeePerGas - block.baseFeePerGas;
          let reward = effectiveGasReward;

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            [10, 50, 80] // for one transaction, it will be the same for all
          ]);

          assert.deepEqual(feeHistory.reward, [[reward, reward, reward]]);
        });
        it("transaction with maxPriorityFeePerGas < effectiveGasReward", async () => {
          const blockCount = "0x1";
          const newestBlock = "latest";
          const maxPrioFeePerGas = "0x989680";
          const txHash = await sendTransaction({
            provider,
            to,
            from,
            maxPriorityFeePerGas: maxPrioFeePerGas
          });

          await mineNBlocks({ provider, blocks: 1 });

          const tx = await provider.send("eth_getTransactionByHash", [txHash]);

          let reward = tx.maxPriorityFeePerGas;

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            [10, 50, 80] // for one transaction, it will be the same for all
          ]);

          assert.deepEqual(feeHistory.reward, [[reward, reward, reward]]);
        });
        it("transactions without maxPriorityFeePerGas (Legacy tx)", async () => {
          const blockCount = "0x1";
          const newestBlock = "latest";

          const txHash = await sendLegacyTransaction({
            provider,
            gasPrice: oneGwei,
            to,
            from
          });

          await mineNBlocks({ provider, blocks: 1 });

          const block = await provider.send("eth_getBlockByNumber", ["latest"]);
          const tx = await provider.send("eth_getTransactionByHash", [txHash]);

          let reward = tx.gasPrice - block.baseFeePerGas;

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            [10, 50, 80] // for one transaction, it will be the same for all
          ]);

          assert.deepEqual(feeHistory.reward, [[reward, reward, reward]]);
        });
        it("blocks with many transactions", async () => {
          const blockCount = "0x1";
          const newestBlock = "latest";

          await sendLegacyTransaction({
            provider,
            gasPrice: oneGwei,
            to,
            from
          });
          await sendLegacyTransaction({
            provider,
            gasPrice: twoGwei,
            to,
            from
          });
          await sendLegacyTransaction({
            provider,
            gasPrice: threeGwei,
            to,
            from
          });
          await sendLegacyTransaction({
            provider,
            gasPrice: fourGwei,
            to,
            from
          });

          await mineNBlocks({ provider, blocks: 1 });

          // This block has 4 standard txs, gas usage will be 84,000
          // Each tx burns 21,000 gas in the block, making reward percentiles four equal quartiles
          const block = await provider.send("eth_getBlockByNumber", ["latest"]);

          // reward = gasPrice - block.baseFeePerGas
          const first25Reward = oneGwei - block.baseFeePerGas; // reward for first 25% of block gas
          const second25Reward = twoGwei - block.baseFeePerGas; // reward for next 25% of block gas
          const third25Reward = threeGwei - block.baseFeePerGas; // etc
          const last25Reward = fourGwei - block.baseFeePerGas; // last 25%

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            [0, 25, 26, 49.99999, 50, 50.5, 51, 75, 76, 100, 200] // 200 is more target gas than was used, will fallback to largest reward
          ]);

          assert.deepEqual(feeHistory.reward, [
            [
              first25Reward,
              first25Reward,
              second25Reward,
              second25Reward,
              second25Reward,
              third25Reward,
              third25Reward,
              third25Reward,
              last25Reward,
              last25Reward,
              last25Reward
            ]
          ]);
        });
        it("multiple blocks with many transactions", async () => {
          const blockCount = "0x2";
          const newestBlock = "latest";

          await sendLegacyTransaction({
            provider,
            gasPrice: oneGwei,
            to,
            from
          });
          await sendLegacyTransaction({
            provider,
            gasPrice: oneGwei,
            to,
            from
          });

          await mineNBlocks({ provider, blocks: 1 });
          const firstBlock = await provider.send("eth_getBlockByNumber", [
            "latest"
          ]);

          const firstBlockReward = Quantity.from(
            oneGwei - firstBlock.baseFeePerGas
          ).toString();

          await sendLegacyTransaction({
            provider,
            gasPrice: fourGwei,
            to,
            from
          });

          await sendLegacyTransaction({
            provider,
            gasPrice: threeGwei,
            to,
            from
          });

          await mineNBlocks({ provider, blocks: 1 });
          const secondBlock = await provider.send("eth_getBlockByNumber", [
            "latest"
          ]);

          const secondBlockFirstHalf = Quantity.from(
            threeGwei - secondBlock.baseFeePerGas
          ).toString();
          const secondBlockSecondHalf = Quantity.from(
            fourGwei - secondBlock.baseFeePerGas
          ).toString();

          const feeHistory = await provider.send("eth_feeHistory", [
            blockCount,
            newestBlock,
            [0, 49, 50, 51, 100]
          ]);

          const blockOneRewards = [
            firstBlockReward,
            firstBlockReward,
            firstBlockReward,
            firstBlockReward,
            firstBlockReward
          ];
          const blockTwoRewards = [
            secondBlockFirstHalf,
            secondBlockFirstHalf,
            secondBlockFirstHalf,
            secondBlockSecondHalf,
            secondBlockSecondHalf
          ];

          assert.deepEqual(feeHistory.reward, [
            blockOneRewards,
            blockTwoRewards
          ]);
        });
      });
    });
  });
});
