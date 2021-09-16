import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";
import { Quantity } from "@ganache/utils";

describe("api", () => {
  describe("eth", () => {
    describe("eth_subscribe*", () => {
      let provider: EthereumProvider;
      let accounts: string[];
      const gasLimit = "0x6691b7";
      const time = new Date("2019/03/15 GMT");

      beforeEach(async () => {
        provider = await getProvider({
          chain: {
            time
          },
          miner: {
            blockGasLimit: gasLimit
          },
          wallet: {
            mnemonic: "sweet treat"
          }
        });
        accounts = await provider.send("eth_accounts");
      });

      describe("newHeads", () => {
        it("subscribes and unsubscribes", async () => {
          const timestamp = ((+time / 1000) | 0) + 1;
          const startingBlockNumber = parseInt(
            await provider.send("eth_blockNumber")
          );
          const subscriptionId = await provider.send("eth_subscribe", [
            "newHeads"
          ]);

          assert(subscriptionId != null);
          assert.notStrictEqual(subscriptionId, false);

          // subscribe again
          const subscriptionId2 = await provider.send("eth_subscribe", [
            "newHeads"
          ]);

          // trigger a mine, we should get two events
          await provider.send("evm_mine", [timestamp]);
          let counter = 0;

          const message = await new Promise(resolve => {
            let firstMessage;
            provider.on("message", (message: any) => {
              counter++;
              if (counter === 1) {
                firstMessage = message;
              }
              if (counter === 2) {
                assert.deepStrictEqual(
                  firstMessage.data.result,
                  message.data.result
                );
                resolve(firstMessage);
              }
            });
          });

          assert.deepStrictEqual(message, {
            type: "eth_subscription",
            data: {
              result: {
                baseFeePerGas: "0x342770c0",
                difficulty: "0x1",
                totalDifficulty: "0x2",
                extraData: "0x",
                gasLimit: gasLimit,
                gasUsed: "0x0",
                hash:
                  "0x9b684f238f60b82ca0af6162da9f3ee80ab3858485b1a291ac07c5d0ac708c1f",
                logsBloom: `0x${"0".repeat(512)}`,
                miner: `0x${"0".repeat(40)}`,
                mixHash: `0x${"0".repeat(64)}`,
                nonce: "0x0000000000000000",
                number: Quantity.from(startingBlockNumber + 1).toString(),
                parentHash:
                  "0xc550a7d0f9b24658dc0b8f60d3cf27dc43afdc7a471591b08f1a39ffd487bfb7",
                receiptsRoot:
                  "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
                sha3Uncles:
                  "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
                stateRoot:
                  "0x4971da3022e43da306da38e8ed8a7990b8f0d842164e1662ee28a84921d59ad4",
                timestamp: Quantity.from(timestamp).toString(),
                transactionsRoot:
                  "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421"
              },
              subscription: subscriptionId
            }
          });

          // trigger a mine... we should only get a _single_ message this time
          const unsubResult = await provider.send("eth_unsubscribe", [
            subscriptionId
          ]);
          assert.strictEqual(unsubResult, true);
          await provider.send("evm_mine", [timestamp]);
          await assert.doesNotReject(
            new Promise((resolve, reject) => {
              provider.on("message", async (message: any) => {
                if (subscriptionId2 === message.data.subscription) {
                  const blockNumber = parseInt(
                    await provider.send("eth_blockNumber")
                  );
                  assert.strictEqual(blockNumber, startingBlockNumber + 2);

                  resolve(void 0);
                } else {
                  reject(new Error("Unsubscribe didn't work!"));
                }
              });
            })
          );
        });
      });

      describe("newPendingTransactions", () => {
        it("subscribes and unsubscribes", async () => {
          const subscriptionId = await provider.send("eth_subscribe", [
            "newPendingTransactions"
          ]);

          assert(subscriptionId != null);
          assert.notStrictEqual(subscriptionId, false);

          // subscribe again
          const subscriptionId2 = await provider.send("eth_subscribe", [
            "newPendingTransactions"
          ]);

          let messagePromise = new Promise(resolve => {
            let firstMessage;
            provider.on("message", (message: any) => {
              counter++;
              if (counter === 1) {
                firstMessage = message;
              }
              if (counter === 2) {
                assert.deepStrictEqual(
                  firstMessage.data.result,
                  message.data.result
                );
                resolve(firstMessage);
              }
            });
          });

          // trigger a pendingTransaction, we should get two events
          const tx = { from: accounts[0], to: accounts[0] };
          const txHash = await provider.send("eth_sendTransaction", [
            { ...tx }
          ]);
          let counter = 0;

          const message = await messagePromise;

          assert.deepStrictEqual(message, {
            type: "eth_subscription",
            data: {
              result: txHash,
              subscription: subscriptionId
            }
          });

          // trigger a mine... we should only get a _single_ message this time
          const unsubResult = await provider.send("eth_unsubscribe", [
            subscriptionId
          ]);
          assert.strictEqual(unsubResult, true);
          messagePromise = new Promise((resolve, reject) => {
            provider.on("message", async (message: any) => {
              if (subscriptionId2 === message.data.subscription) {
                assert.strictEqual(message.data.result, txHash2);

                resolve(message.data.result);
              } else {
                reject(new Error("Unsubscribe didn't work!"));
              }
            });
          });
          const txHash2 = await provider.send("eth_sendTransaction", [
            { ...tx }
          ]);
          await assert.doesNotReject(messagePromise);
        });
      });

      it("returns false for unsubscribe with bad id", async () => {
        const unsubResult = await provider.send("eth_unsubscribe", ["0xffff"]);
        assert.strictEqual(unsubResult, false);
      });
    });
  });
});
