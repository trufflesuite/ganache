import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import { Quantity } from "@ganache/utils";
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
        beforeEach(async () => {
          const optionsJson = {
            wallet: {
              deterministic: true
            }
          };
          provider = await getProvider(optionsJson);
        });
        afterEach(async () => {
          provider && (await provider.disconnect());
        });

        describe(`before transactions are sent`, () => {
          it(`gets the block after "latest" block`, async () => {
            const pendingBlock = await provider.send("eth_getBlockByNumber", ["pending"]); // prettier-ignore
            const latestBlock = await provider.send("eth_getBlockByNumber", ["latest"]); // prettier-ignore
            assert.strictEqual(
              Quantity.from(pendingBlock.number).toNumber(),
              Quantity.from(latestBlock.number).toNumber() + 1
            );
          });
        });

        describe(`with transactions queued to be mined`, () => {
          beforeEach(async () => {
            const optionsJson = {
              wallet: {
                deterministic: true
              },
              miner: {
                blockGasLimit: "0xF618", // 63000, or sending three empty txs
                blockTime: 60
              }
            };
            provider = await getProvider(optionsJson);
          });
          it(`returns a block with as many queued transactions that will fit in the block`, async () => {
            await provider.send("miner_stop"); // pause the miner so we can queue up some txs
            const [to, from] = await provider.send("eth_accounts");
            const tx = {
              to: to,
              from: from,
              gasPrice: "0x3B9ACAFF",
              nonce: null,
              gas: "0x5208"
            };
            // we'll send 4 txs, more than will fit into the block
            for (let i = 0; i < 4; i++) {
              tx.nonce = "0x" + i.toString();
              await provider.send("eth_sendTransaction", [tx]);
            }
            const pendingBlock = await provider.send("eth_getBlockByNumber", ["pending", true]); // prettier-ignore
            const pendingBlockTxs = pendingBlock.transactions;
            // only 3 of the 4 txs are on the pending block, cause that's all that fits in a block
            assert.strictEqual(pendingBlockTxs.length, 3);
            for (let i = 0; i < 3; i++) {
              // the txs are ordered how they would be in a real block, by nonce
              assert.strictEqual(pendingBlockTxs[i].nonce, "0x" + i.toString());
            }
          });
        });

        describe.only(`while transactions are being mined`, () => {
          it(`returns a block that is identical to (the "latest" block after the transactions are mined)`, async () => {
            await provider.send("miner_stop"); // pause the miner so we can queue up some txs
            await provider.send("eth_subscribe", ["newHeads"]);
            const [to, from] = await provider.send("eth_accounts");
            const tx = {
              to: to,
              from: from,
              gasPrice: "0x3B9ACAFF",
              nonce: null,
              gas: "0x5208"
            };

            // send 3 txs
            for (let i = 0; i < 3; i++) {
              tx.nonce = "0x" + i.toString();
              await provider.send("eth_sendTransaction", [tx]);
            }
            provider.send("miner_start"); // don't await so we can get the pending block while mining is taking place

            const pendingBlock = await provider.send("eth_getBlockByNumber", ["pending", true]); // prettier-ignore
            const pendingBlockTxs = pendingBlock.transactions;
            //await provider.once("message"); // make sure all the txs are mined and a new block is made
            const latestBlock = await provider.send("eth_getBlockByNumber", ["latest", true]); // prettier-ignore
            const latestBlockTxs = latestBlock.transactions;

            // pending block before mining completes is equal to latest after mining completes
            assert.strictEqual(pendingBlock.number, latestBlock.number);
            // all three txs were mined for creation of the pending block
            assert.strictEqual(pendingBlockTxs.length, 3);
            // all three txs were mined for the latest block
            assert.strictEqual(latestBlockTxs.length, 3);
            for (let i = 0; i < 3; i++) {
              // the txs in each block are identical
              assert.strictEqual(
                pendingBlockTxs[i].hash,
                latestBlockTxs[i].hash
              );
            }
          }).timeout(50000);
        });
      });
    });
  });
});
