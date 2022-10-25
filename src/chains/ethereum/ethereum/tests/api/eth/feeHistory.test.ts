import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { Quantity } from "@ganache/utils";
import {
  EIP1559FeeMarketRpcTransaction,
  LegacyRpcTransaction
} from "@ganache/ethereum-transaction";
import { Ethereum } from "../../../src/api-types";

let provider: EthereumProvider;
const oneGwei = Quantity.Gwei;
const twoGwei = Quantity.from(2e9);
const threeGwei = Quantity.from(3e9);
const fourGwei = Quantity.from(4e9);

async function sendTransaction(params) {
  const { provider, from, to, maxPriorityFeePerGas } = params;
  const tx: EIP1559FeeMarketRpcTransaction = {
    from,
    to,
    value: "0x123",
    type: "0x2",
    maxPriorityFeePerGas
  };
  return await provider.send("eth_sendTransaction", [tx]);
}
async function sendLegacyTransaction(params) {
  const { provider, from, to, gasPrice } = params;
  const tx: LegacyRpcTransaction = {
    from,
    to,
    value: "0x123",
    gasPrice
  };
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
      let to: string, from: string;
      const genesisBlock = "0x0";
      const headerNotFoundBlock = "0x999999";
      const ERROR_HEADER_NOT_FOUND = "header not found";

      beforeEach(async () => {
        provider = await getProvider();
        await provider.send("miner_stop");
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

            assert.strictEqual(feeHistory.oldestBlock, "0x8");
            assert.strictEqual(feeHistory.baseFeePerGas.length, 4); // blockCount + 1
            assert.strictEqual(feeHistory.gasUsedRatio.length, 3);
          });

          it("blockCount min = 1", async () => {
            const blockCount = "0x0";
            const newestBlock = "0x0";

            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.strictEqual(feeHistory.oldestBlock, "0x0");
            assert.strictEqual(feeHistory.gasUsedRatio.length, 1);
          });
          it("blockCount max = 1024", async () => {
            const blockCount = "0x401";
            const newestBlock = "0x3ff";

            await mineNBlocks({ provider, blocks: 1024 });

            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.strictEqual(feeHistory.oldestBlock, "0x0");
            assert.strictEqual(feeHistory.gasUsedRatio.length, 1024);
          });
          describe("newestBlock", () => {
            it("throws if header is not found", async () => {
              const blockCount = "0x1";
              await assert.rejects(
                provider.send("eth_feeHistory", [
                  blockCount,
                  headerNotFoundBlock,
                  []
                ]),
                new Error(ERROR_HEADER_NOT_FOUND)
              );
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

              assert.strictEqual(feeHistory.reward, undefined);
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

            assert.strictEqual(feeHistory.oldestBlock, genesisBlock);
            assert.strictEqual(feeHistory.baseFeePerGas.length, 4); // blocks found + 1
            assert.strictEqual(feeHistory.gasUsedRatio.length, 3);
          });
          it("newestBlock = oldestBlock when blockCount === 1", async () => {
            const blockCount = "0x1";
            const newestBlock = "0x2";
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.strictEqual(feeHistory.oldestBlock, newestBlock);
          });
          it("oldestBlock = newestBlock - blockCount +1", async () => {
            const blockCount = "0x3";
            const newestBlock = "0xa";
            const oldestBlock = Quantity.from(
              parseInt(newestBlock, 16) - parseInt(blockCount, 16) + 1
            ).toString();
            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.strictEqual(feeHistory.oldestBlock, oldestBlock);
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

            assert.strictEqual(feeHistory.gasUsedRatio[0], 0);
          });
          it("returns gasUsed / maxGas", async () => {
            await sendTransaction({ provider, to, from });

            const block = await provider.send("eth_getBlockByNumber", [
              "latest"
            ]);

            const blockCount = "0x1";
            const newestBlock = block.number;

            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.strictEqual(feeHistory.gasUsedRatio.length, 1);
            assert.strictEqual(
              feeHistory.gasUsedRatio[0],
              Number(block.gasUsed) / Number(block.gasLimit)
            );
          });
          it("returns one entry for each block", async () => {
            await mineNBlocks({ provider, blocks: 1 });
            await sendTransaction({ provider, to, from });
            await mineNBlocks({ provider, blocks: 1 });
            const block = await provider.send("eth_getBlockByNumber", [
              "latest"
            ]);

            const blockCount = "0x2";
            const newestBlock = block.number;

            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.strictEqual(feeHistory.gasUsedRatio.length, 2);
            assert.strictEqual(feeHistory.gasUsedRatio[0], 0);
            assert.strictEqual(
              feeHistory.gasUsedRatio[1],
              Number(block.gasUsed) / Number(block.gasLimit)
            );
          });
          it("handles gasUsedRatio === 1", async () => {
            const blockCount = "0x1";
            const newestBlock = "latest";
            provider = await getProvider({
              miner: {
                defaultTransactionGasLimit: 21000,
                blockGasLimit: 21000
              }
            });

            [to, from] = await provider.send("eth_accounts");

            await sendTransaction({
              provider,
              to,
              from
            });

            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.strictEqual(feeHistory.gasUsedRatio[0], 1);
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

            assert.strictEqual(feeHistory.baseFeePerGas.length, blocks + 1);
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

            assert.strictEqual(feeHistory.baseFeePerGas.length, blocks + 1);
            assert.strictEqual(
              feeHistory.baseFeePerGas[blocks - 1],
              block.baseFeePerGas
            );
          });
          it("calculates the last baseFeePerGas based on the latest block", async () => {
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

            assert.strictEqual(
              latestBlockFeePerGas * emptyBlockDelta,
              pendingBlockFeePerGas
            );
          });
        });
        describe("reward", () => {
          it("throws if a percentile is < 0", async () => {
            const blockCount = "0x0";
            const newestBlock = "latest";
            const percentile = [-10];

            const message = `Error: invalid reward percentile: ${percentile}`;

            assert.rejects(async () => {
              await provider.send("eth_feeHistory", [
                blockCount,
                newestBlock,
                percentile
              ]);
            }, message);
            assert.rejects(async () => {
              await provider.send("eth_feeHistory", [
                blockCount,
                newestBlock,
                percentile
              ]);
            }, message);
          });
          it("throws if percentile is > 100", async () => {
            const blockCount = "0x0";
            const newestBlock = "latest";
            const percentile = 110;
            const message = `Error: invalid reward percentile: ${percentile}`;

            assert.rejects(async () => {
              await provider.send("eth_feeHistory", [
                blockCount,
                newestBlock,
                [5, 10, percentile]
              ]);
            }, message);
          });
          it("throws if a percentile is not ascending", async () => {
            const blockCount = "0x0";
            const newestBlock = "latest";
            const percentiles = [0, 10, 50, 10];
            const message = `Error: invalid reward percentile: 50 10`;

            assert.rejects(async () => {
              await provider.send("eth_feeHistory", [
                blockCount,
                newestBlock,
                percentiles
              ]);
            }, message);
          });
          it("throws if a percentile is not unique", async () => {
            const blockCount = "0x0";
            const newestBlock = "latest";
            const percentiles = [0, 10, 10, 50];
            const message = `Error: invalid reward percentile: 10 10`;

            assert.rejects(async () => {
              await provider.send("eth_feeHistory", [
                blockCount,
                newestBlock,
                percentiles
              ]);
            }, message);
          });
          it("returns undefined if no reward is specified", async () => {
            const blockCount = "0x1";
            const newestBlock = "latest";

            await mineNBlocks({ provider, blocks: 5 });

            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              []
            ]);

            assert.strictEqual(feeHistory.reward, undefined);
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
          it("handles transactions with maxPriorityFeePerGas > effectiveGasReward", async () => {
            const blockCount = "0x1";
            const newestBlock = "latest";
            const txHash = await sendTransaction({
              provider,
              to,
              from
            });

            await mineNBlocks({ provider, blocks: 1 });

            const block = await provider.send("eth_getBlockByNumber", [
              "latest"
            ]);
            const tx = (await provider.send("eth_getTransactionByHash", [
              txHash
            ])) as Ethereum.Block.Transaction.EIP1559;
            const reward =
              Quantity.from(tx.maxFeePerGas).toBigInt() -
              Quantity.from(block.baseFeePerGas).toBigInt();

            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              [10, 50, 80] // for one transaction, it will be the same for all
            ]);

            assert.deepEqual(feeHistory.reward, [[reward, reward, reward]]);
          });
          it("handles transactions with maxPriorityFeePerGas < effectiveGasReward", async () => {
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

            const tx = (await provider.send("eth_getTransactionByHash", [
              txHash
            ])) as Ethereum.Block.Transaction.EIP1559;

            const reward = tx.maxPriorityFeePerGas;

            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              [10, 50, 80] // for one transaction, it will be the same for all
            ]);

            assert.deepEqual(feeHistory.reward, [[reward, reward, reward]]);
          });
          it("handles transactions without maxPriorityFeePerGas (Legacy tx)", async () => {
            const blockCount = "0x1";
            const newestBlock = "latest";

            const txHash = await sendLegacyTransaction({
              provider,
              gasPrice: oneGwei,
              to,
              from
            });

            await mineNBlocks({ provider, blocks: 1 });

            const block = await provider.send("eth_getBlockByNumber", [
              "latest"
            ]);
            const tx = await provider.send("eth_getTransactionByHash", [
              txHash
            ]);

            const reward =
              Quantity.from(tx.gasPrice).toBigInt() -
              Quantity.from(block.baseFeePerGas).toBigInt();

            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              [10, 50, 80] // for one transaction, it will be the same for all
            ]);

            assert.deepEqual(feeHistory.reward, [[reward, reward, reward]]);
          });
          it("handles blocks with many transactions", async () => {
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
            const block = await provider.send("eth_getBlockByNumber", [
              "latest"
            ]);

            // reward = gasPrice - block.baseFeePerGas
            const first25Reward =
              oneGwei.toBigInt() -
              Quantity.from(block.baseFeePerGas).toBigInt(); // reward for first 25% of block gas
            const second25Reward =
              twoGwei.toBigInt() -
              Quantity.from(block.baseFeePerGas).toBigInt(); // reward for next 25% of block gas
            const third25Reward =
              threeGwei.toBigInt() -
              Quantity.from(block.baseFeePerGas).toBigInt(); // etc
            const last25Reward =
              fourGwei.toBigInt() -
              Quantity.from(block.baseFeePerGas).toBigInt(); // last 25%

            const feeHistory = await provider.send("eth_feeHistory", [
              blockCount,
              newestBlock,
              [0, 25, 26, 49.99999, 50, 50.5, 51, 75, 76, 100]
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
                last25Reward
              ]
            ]);
          });
          it("handles multiple blocks with many transactions", async () => {
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
              oneGwei.toBigInt() -
                Quantity.from(firstBlock.baseFeePerGas).toBigInt()
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
              threeGwei.toBigInt() -
                Quantity.from(secondBlock.baseFeePerGas).toBigInt()
            ).toString();
            const secondBlockSecondHalf = Quantity.from(
              fourGwei.toBigInt() -
                Quantity.from(secondBlock.baseFeePerGas).toBigInt()
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
});
