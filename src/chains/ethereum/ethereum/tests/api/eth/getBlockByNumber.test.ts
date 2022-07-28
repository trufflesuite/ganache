import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { Quantity } from "@ganache/utils";
import { Ethereum } from "../../../typings";
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

      describe(`passing "pending" tag`, () => {
        let from, to: string;
        const emptyTransactionsPerBlock = 2;
        const blockGasLimit = "0xA410"; // enough gas for 2 empty txs

        /**
         * Fetches a block with number `pendingBlock.number` and asserts that
         * the resultant block is deep strict equal to the `pendingBlock`
         * @param pendingBlock The pending block to compare.
         */
        const assertPendingEqualsMined = async (
          pendingBlock: Ethereum.Block
        ) => {
          const minedBlock = await provider.send("eth_getBlockByNumber", [
            pendingBlock.number
          ]);

          assert.deepStrictEqual(
            pendingBlock,
            minedBlock,
            `Pending block wasn't equal to next mined block.`
          );
        };

        const subAndAwaitBlock = async () => {
          const subId = await provider.send("eth_subscribe", ["newHeads"]);
          // this won't do anything if the miner isn't paused, so no harm in
          // calling
          await provider.send("miner_start");
          await provider.once("message");
          await provider.send("eth_unsubscribe", [subId]);
        };

        const itFillsBlock = () =>
          it(`has all executable transactions in the pool that will fit within the block \`gasLimit\` and is equal to next mined block`, async () => {
            // send 1 more transaction than will fit in the block
            for (let i = 0; i < emptyTransactionsPerBlock + 1; i++) {
              await provider.send("eth_sendTransaction", [
                { from, to, gas: "0x5208" }
              ]);
            }
            const pendingBlock = await provider.send("eth_getBlockByNumber", [
              "pending"
            ]);
            assert.strictEqual(
              pendingBlock.transactions.length,
              emptyTransactionsPerBlock,
              `Pending block didn't have expected number of transactions.`
            );
            await subAndAwaitBlock();
            await assertPendingEqualsMined(pendingBlock);
          });

        const itMinesQueuedTxs = () =>
          it(`includes any queued transactions that are made executable when mining and is equal to next mined block`, async () => {
            let hashes: string[] = [];
            for (let i = 1; i <= emptyTransactionsPerBlock; i++) {
              hashes.push(
                await provider.send("eth_sendTransaction", [
                  {
                    from,
                    to,
                    gas: "0x5208",
                    // set the nonce descending from number of transactions being
                    // sent down to 0, so the last one triggers the rest becoming
                    // executable
                    nonce: Quantity.toString(emptyTransactionsPerBlock - i)
                  }
                ])
              );
            }
            const pendingBlock = await provider.send("eth_getBlockByNumber", [
              "pending"
            ]);

            const transactionHashes = pendingBlock.transactions as string[];
            assert.strictEqual(
              transactionHashes.length,
              hashes.length,
              `Pending block didn't have expected number of transactions.`
            );

            hashes.forEach((hash: string) => {
              assert(
                transactionHashes.includes(hash),
                `Transaction is missing from pending block.`
              );
            });

            await subAndAwaitBlock();

            await assertPendingEqualsMined(pendingBlock);
          });

        const itLeavesPoolUnchanged = () =>
          it(`does not alter the transaction pool`, async () => {
            for (let i = 0; i < emptyTransactionsPerBlock; i++) {
              await provider.send("eth_sendTransaction", [
                { from, to, gas: "0x5208" }
              ]);
            }
            // add another to the queued pool for good measure
            await provider.send("eth_sendTransaction", [
              { from, to, gas: "0x5208", nonce: "0xfffff" }
            ]);

            const beforePool = await provider.send("txpool_content");
            await provider.send("eth_getBlockByNumber", ["pending"]);
            const afterPool = await provider.send("txpool_content");

            assert.deepStrictEqual(
              beforePool,
              afterPool,
              `Transaction pool changed while fetching pending block.`
            );
          });

        describe("basic checks", () => {
          beforeEach(async () => {
            provider = await getProvider({});
            [from, to] = await provider.send("eth_accounts");
          });
          afterEach(async () => {
            provider && (await provider.disconnect());
          });

          it(`has a block number of "latest" block + 1`, async () => {
            const pendingBlock = await provider.send("eth_getBlockByNumber", [
              "pending"
            ]);
            const latestBlock = await provider.send("eth_getBlockByNumber", [
              "latest"
            ]);
            assert.strictEqual(
              Quantity.toNumber(pendingBlock.number),
              Quantity.toNumber(latestBlock.number) + 1,
              `Pending block doesn't have expected number.`
            );
          });

          it(`has the correct \`baseFeePerGas\``, async () => {
            const pendingBlock = await provider.send("eth_getBlockByNumber", [
              "pending"
            ]);
            const latestBlock = await provider.send("eth_getBlockByNumber", [
              "latest"
            ]);
            // baseFeePerGas is .875 (aka 7/8) of the previous block if empty
            const expected =
              (Quantity.toBigInt(latestBlock.baseFeePerGas) * 7n) / 8n;
            assert.strictEqual(
              Quantity.toBigInt(pendingBlock.baseFeePerGas),
              expected,
              `Pending block doesn't have expected \`baseFeePerGas\`.`
            );
          });

          it(`has no transactions if the pool is empty`, async () => {
            const pendingBlock = await provider.send("eth_getBlockByNumber", [
              "pending"
            ]);
            assert.strictEqual(
              pendingBlock.transactions.length,
              0,
              `Pending block isn't empty when the transaction pool was empty.`
            );
          });
        });

        describe("`miner.blockTime=0` mode", () => {
          beforeEach(async () => {
            provider = await getProvider({
              miner: {
                // strict mode doesn't affect the contents of the pending block,
                // but it will make it easier to fetch a pending block before
                // transactions start mining
                instamine: "strict",
                blockGasLimit
              }
            });
            [from, to] = await provider.send("eth_accounts");
          });

          afterEach(async () => {
            provider && (await provider.disconnect());
          });

          it(`has one transaction regardless of the number of executables in the pool and is equal to next mined block`, async () => {
            // send 1 more transaction than will fit in the block
            for (let i = 0; i < emptyTransactionsPerBlock + 1; i++) {
              // we're in strict mode, so we can await sending the transaction
              // and it will be in the pool but not yet mined
              await provider.send("eth_sendTransaction", [
                { from, to, gas: "0x5208" }
              ]);
            }
            const pendingBlock = await provider.send("eth_getBlockByNumber", [
              "pending"
            ]);
            assert.strictEqual(
              pendingBlock.transactions.length,
              1,
              `Pending block didn't have expected number of transactions.`
            );
            await assertPendingEqualsMined(pendingBlock);
          });
        });

        describe("paused `miner.blockTime=0` mode", () => {
          beforeEach(async () => {
            provider = await getProvider({
              miner: {
                blockGasLimit
              }
            });
            [from, to] = await provider.send("eth_accounts");
            await provider.send("miner_stop");
          });

          afterEach(async () => {
            provider && (await provider.disconnect());
          });

          itFillsBlock();
          itLeavesPoolUnchanged();
          itMinesQueuedTxs();
        });

        describe("`miner.blockTime>0` mode", () => {
          beforeEach(async () => {
            provider = await getProvider({
              miner: {
                blockTime: 1,
                blockGasLimit
              }
            });
            [from, to] = await provider.send("eth_accounts");
          });

          afterEach(async () => {
            provider && (await provider.disconnect());
          });

          itFillsBlock();
          itLeavesPoolUnchanged();
          itMinesQueuedTxs();
        });
      });
    });
  });
});
