import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";
import compile from "../../helpers/compile";
import { join } from "path";
import { promises } from "fs-extra";

describe("api", () => {
  describe("eth", () => {
    describe("logs", () => {
      let provider: EthereumProvider;
      let contract: ReturnType<typeof compile>;
      let contractAddress: string;
      let accounts: string[];

      beforeEach(async () => {
        contract = compile(join(__dirname, "./contracts/Logs.sol"));
        provider = await getProvider();
        accounts = await provider.send("eth_accounts");

        const subscriptionId = await provider.send("eth_subscribe", [
          "newHeads"
        ]);
        const transactionHash = await provider.send("eth_sendTransaction", [
          {
            from: accounts[0],
            data: contract.code,
            gas: "0x2fefd8"
          }
        ]);
        await provider.once("message");
        const transactionReceipt = await provider.send(
          "eth_getTransactionReceipt",
          [transactionHash]
        );
        contractAddress = transactionReceipt.contractAddress;
        await provider.send("eth_unsubscribe", [subscriptionId]);
      });

      describe("eth_subscribe", () => {
        describe("logs", () => {
          const onceMessageFor = subId => {
            return new Promise<any>(resolve => {
              provider.on("message", message => {
                if (message.data.subscription === subId) {
                  resolve(message);
                }
              });
            });
          };

          it("subscribes and unsubscribes", async () => {
            const subscriptionId = await provider.send("eth_subscribe", [
              "logs"
            ]);

            assert(subscriptionId != null);
            assert.notStrictEqual(subscriptionId, false);

            // subscribe again
            const subscriptionId2 = await provider.send("eth_subscribe", [
              "logs"
            ]);

            // trigger a log event, we should get two events
            const numberOfLogs = 4;
            const data =
              "0x" +
              contract.contract.evm.methodIdentifiers["logNTimes(uint8)"] +
              numberOfLogs.toString().padStart(64, "0");
            const tx = { from: accounts[0], to: contractAddress, data };
            const subs = [
              onceMessageFor(subscriptionId),
              onceMessageFor(subscriptionId2)
            ];
            const txHash = await provider.send("eth_sendTransaction", [
              { ...tx }
            ]);

            const [message1, message2] = await Promise.all(subs);
            assert.deepStrictEqual(message1.data.result, message2.data.result);

            assert.strictEqual(message1.data.result.length, numberOfLogs);

            const unsubscribeResult = await provider.send("eth_unsubscribe", [
              subscriptionId
            ]);
            assert.strictEqual(unsubscribeResult, true);
            await provider.send("eth_sendTransaction", [{ ...tx }]);
            const message = await Promise.race([
              onceMessageFor(subscriptionId),
              onceMessageFor(subscriptionId2)
            ]);
            assert.strictEqual(
              message.data.subscription,
              subscriptionId2,
              "unsubscribe didn't work"
            );
          });
        });
      });

      describe("getLogs", () => {
        it("should return a log for the constructor transaction", async () => {
          const logs = await provider.send("eth_getLogs", [
            { address: contractAddress }
          ]);
          assert.strictEqual(logs.length, 1);
        });

        it("should return the logs", async () => {
          await provider.send("eth_subscribe", ["newHeads"]);
          const numberOfLogs = 4;
          const data =
            "0x" +
            contract.contract.evm.methodIdentifiers["logNTimes(uint8)"] +
            numberOfLogs.toString().padStart(64, "0");
          const txHash = await provider.send("eth_sendTransaction", [
            {
              from: accounts[0],
              to: contractAddress,
              gas: "0x2fefd8",
              data: data
            }
          ]);
          await provider.once("message");
          const txReceipt = await provider.send("eth_getTransactionReceipt", [
            txHash
          ]);
          assert.deepStrictEqual(txReceipt.logs.length, numberOfLogs);
          const logs = await provider.send("eth_getLogs", [
            { address: contractAddress }
          ]);
          assert.deepStrictEqual(logs, txReceipt.logs);
        });

        it("should filter out other blocks when using `latest`", async () => {
          await provider.send("eth_subscribe", ["newHeads"]);
          const numberOfLogs = 4;
          const data =
            "0x" +
            contract.contract.evm.methodIdentifiers["logNTimes(uint8)"] +
            numberOfLogs.toString().padStart(64, "0");
          await provider.send("eth_sendTransaction", [
            {
              from: accounts[0],
              to: contractAddress,
              gas: "0x2fefd8",
              data: data
            }
          ]);
          await provider.once("message");
          await provider.send("evm_mine");
          await provider.once("message");
          const logs = await provider.send("eth_getLogs", [
            { address: contractAddress, toBlock: "latest", fromBlock: "latest" }
          ]);
          assert.strictEqual(logs.length, 0);
        });

        it("should filter appropriately when using fromBlock and toBlock", async () => {
          const genesisBlockNumber = "0x0";
          const deployBlockNumber = "0x1";
          const emptyBlockNumber = "0x2";
          await provider.send("evm_mine"); // 0x2

          await provider.send("eth_subscribe", ["newHeads"]);
          const numberOfLogs = 4;
          const data =
            "0x" +
            contract.contract.evm.methodIdentifiers["logNTimes(uint8)"] +
            numberOfLogs.toString().padStart(64, "0");
          const txHash = await provider.send("eth_sendTransaction", [
            {
              from: accounts[0],
              to: contractAddress,
              gas: "0x2fefd8",
              data: data
            }
          ]); // 0x3
          await provider.once("message");
          const {
            blockNumber
          } = await provider.send("eth_getTransactionReceipt", [txHash]);

          async function testGetLogs(
            fromBlock: string,
            toBlock: string,
            expected: number,
            address: string = contractAddress
          ) {
            const logs = await provider.send("eth_getLogs", [
              { address, fromBlock, toBlock }
            ]);
            assert.strictEqual(
              logs.length,
              expected,
              `there should be ${expected} log(s) between the ${fromBlock} block and the ${toBlock} block`
            );
          }

          // tests ranges up to latest/blockNumber
          await testGetLogs("earliest", "earliest", 0);
          await testGetLogs(genesisBlockNumber, genesisBlockNumber, 0);
          await testGetLogs("earliest", emptyBlockNumber, 1);
          await testGetLogs(genesisBlockNumber, emptyBlockNumber, 1);
          await testGetLogs("earliest", "latest", numberOfLogs + 1);
          await testGetLogs("earliest", blockNumber, numberOfLogs + 1);
          await testGetLogs(genesisBlockNumber, "latest", numberOfLogs + 1);
          await testGetLogs(genesisBlockNumber, blockNumber, numberOfLogs + 1);
          await testGetLogs(deployBlockNumber, "latest", numberOfLogs + 1);
          await testGetLogs(deployBlockNumber, blockNumber, numberOfLogs + 1);
          await testGetLogs(emptyBlockNumber, "latest", numberOfLogs);
          await testGetLogs(emptyBlockNumber, blockNumber, numberOfLogs);

          // tests variations where latest === blockNumber
          await testGetLogs(blockNumber, blockNumber, numberOfLogs);
          await testGetLogs(blockNumber, "latest", numberOfLogs);
          await testGetLogs("latest", blockNumber, numberOfLogs);
          await testGetLogs("latest", "latest", numberOfLogs);

          // mine an extra block
          await provider.send("evm_mine"); // 0x3
          const lastBlockNumber = `0x${(parseInt(blockNumber) + 1).toString(
            16
          )}`;
          await provider.once("message");

          // test variations of `earliest` and `0x0`
          await testGetLogs(genesisBlockNumber, genesisBlockNumber, 0);
          await testGetLogs("earliest", "earliest", 0);
          await testGetLogs("earliest", genesisBlockNumber, 0);
          await testGetLogs(genesisBlockNumber, "earliest", 0);

          // test misc ranges not already tested
          await testGetLogs(genesisBlockNumber, deployBlockNumber, 1);
          await testGetLogs("earliest", deployBlockNumber, 1);
          await testGetLogs("earliest", "latest", numberOfLogs + 1);
          await testGetLogs(genesisBlockNumber, "latest", numberOfLogs + 1);
          await testGetLogs(deployBlockNumber, "latest", numberOfLogs + 1);
          // test variations involving the last block number
          await testGetLogs(
            genesisBlockNumber,
            lastBlockNumber,
            numberOfLogs + 1
          );
          await testGetLogs(
            deployBlockNumber,
            lastBlockNumber,
            numberOfLogs + 1
          );
          await testGetLogs(emptyBlockNumber, lastBlockNumber, numberOfLogs);
          await testGetLogs(lastBlockNumber, "latest", 0);
          await testGetLogs("latest", lastBlockNumber, 0);
        });

        it("should filter appropriately when using blockHash", async () => {
          const genesisBlockNumber = "0x0";
          const deployBlockNumber = "0x1";
          const emptyBlockNumber = "0x2";
          await provider.send("evm_mine"); // 0x2

          await provider.send("eth_subscribe", ["newHeads"]);
          const numberOfLogs = 4;
          const data =
            "0x" +
            contract.contract.evm.methodIdentifiers["logNTimes(uint8)"] +
            numberOfLogs.toString().padStart(64, "0");
          const txHash = await provider.send("eth_sendTransaction", [
            {
              from: accounts[0],
              to: contractAddress,
              gas: "0x2fefd8",
              data: data
            }
          ]); // 0x3
          await provider.once("message");
          const { blockHash } = await provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );

          async function testGetLogs(
            blockHash: string,
            expected: number,
            address: string = contractAddress
          ) {
            const logs = await provider.send("eth_getLogs", [
              { address, blockHash }
            ]);
            assert.strictEqual(
              logs.length,
              expected,
              `there should be ${expected} log(s) at the ${blockHash} block`
            );
          }

          // tests blockHash
          let {
            hash: genesisBlockHash
          } = await provider.send("eth_getBlockByNumber", [genesisBlockNumber]);
          await testGetLogs(blockHash, 4);
          await testGetLogs(genesisBlockHash, 0);
          let {
            hash: deployBlockHash
          } = await provider.send("eth_getBlockByNumber", [deployBlockNumber]);
          await testGetLogs(deployBlockHash, 1, null);
          let {
            hash: emptyBlockHash
          } = await provider.send("eth_getBlockByNumber", [emptyBlockNumber]);
          await testGetLogs(emptyBlockHash, 0);
          const invalidBlockHash = "0x123456789";
          await testGetLogs(invalidBlockHash, 0);

          // mine an extra block
          await provider.send("evm_mine");
          await provider.once("message");

          // make sure we still get the right data
          await testGetLogs(blockHash, 4);
        });
      });

      describe("eth_newBlockFilter", () => {
        it("returns new blocks", async () => {
          await provider.send("eth_subscribe", ["newHeads"]);
          async function assertNoChanges() {
            const noChanges = await provider.send("eth_getFilterChanges", [
              filterId
            ]);
            assert.strictEqual(noChanges.length, 0);
          }
          const filterId = await provider.send("eth_newBlockFilter");
          await assertNoChanges();
          await provider.send("evm_mine");
          await provider.once("message");
          const changes1 = await provider.send("eth_getFilterChanges", [
            filterId
          ]);
          let blockNum = await provider.send("eth_blockNumber");
          let { hash } = await provider.send("eth_getBlockByNumber", [
            blockNum
          ]);
          assert.strictEqual(changes1[0], hash);
          await assertNoChanges();
          await provider.send("evm_mine");
          await provider.once("message");
          blockNum = await provider.send("eth_blockNumber");
          let { hash: hash2 } = await provider.send("eth_getBlockByNumber", [
            blockNum
          ]);
          await provider.send("evm_mine");
          await provider.once("message");
          blockNum = await provider.send("eth_blockNumber");
          let { hash: hash3 } = await provider.send("eth_getBlockByNumber", [
            blockNum
          ]);

          const changes2 = await provider.send("eth_getFilterChanges", [
            filterId
          ]);
          assert.strictEqual(changes2[0], hash2);
          assert.strictEqual(changes2[1], hash3);
          await assertNoChanges();
        });
      });

      describe("eth_newPendingTransactionFilter", () => {
        it("returns new pending transactions", async () => {
          await provider.send("eth_subscribe", ["newPendingTransactions"]);
          async function assertNoChanges() {
            const noChanges = await provider.send("eth_getFilterChanges", [
              filterId
            ]);
            assert.strictEqual(noChanges.length, 0);
          }
          const filterId = await provider.send(
            "eth_newPendingTransactionFilter"
          );
          const tx = { from: accounts[0], to: accounts[0] };
          await assertNoChanges();
          provider.send("eth_sendTransaction", [{ ...tx }]);
          let hash = await provider.once("message");
          const changes1 = await provider.send("eth_getFilterChanges", [
            filterId
          ]);
          assert.strictEqual(changes1[0], hash.data.result);
          await assertNoChanges();
          provider.send("eth_sendTransaction", [{ ...tx }]);
          let hash2 = await provider.once("message");
          provider.send("eth_sendTransaction", [{ ...tx }]);
          let hash3 = await provider.once("message");

          const changes2 = await provider.send("eth_getFilterChanges", [
            filterId
          ]);
          assert.strictEqual(changes2[0], hash2.data.result);
          assert.strictEqual(changes2[1], hash3.data.result);
          await assertNoChanges();
        });
      });

      describe("eth_newFilter", () => {
        it("returns new logs", async () => {
          await provider.send("eth_subscribe", ["newHeads"]);
          async function assertNoChanges() {
            const noChanges = await provider.send("eth_getFilterChanges", [
              filterId
            ]);
            assert.strictEqual(noChanges.length, 0);
          }
          const filterId = await provider.send("eth_newFilter");
          const numberOfLogs = 1;
          const data =
            "0x" +
            contract.contract.evm.methodIdentifiers["logNTimes(uint8)"] +
            numberOfLogs.toString().padStart(64, "0");
          const tx = { from: accounts[0], to: contractAddress, data };
          await assertNoChanges();
          provider.send("eth_sendTransaction", [{ ...tx }]);
          let msg = await provider.once("message");
          const changes1 = await provider.send("eth_getFilterChanges", [
            filterId
          ]);
          assert.strictEqual(changes1.length, 1);
          await assertNoChanges();
          provider.send("eth_sendTransaction", [{ ...tx }]);
          let msg2 = await provider.once("message");
          provider.send("eth_sendTransaction", [{ ...tx }]);
          let hash3 = await provider.once("message");

          const changes2 = await provider.send("eth_getFilterChanges", [
            filterId
          ]);
          assert.strictEqual(changes2.length, 2);
          await assertNoChanges();
        });
      });

      describe("eth_newFilter", () => {
        it("returns new logs", async () => {
          await provider.send("eth_subscribe", ["newHeads"]);
          async function assertNoChanges() {
            const noChanges = await provider.send("eth_getFilterChanges", [
              filterId
            ]);
            assert.strictEqual(noChanges.length, 0);
          }
          const currentBlockNumber =
            "0x" +
            (parseInt(await provider.send("eth_blockNumber")) + 1).toString(16);
          const filterId = await provider.send("eth_newFilter", [
            { fromBlock: currentBlockNumber, toBlock: "0x99" }
          ]);
          const numberOfLogs = 1;
          const data =
            "0x" +
            contract.contract.evm.methodIdentifiers["logNTimes(uint8)"] +
            numberOfLogs.toString().padStart(64, "0");
          const tx = { from: accounts[0], to: contractAddress, data };
          await assertNoChanges();
          provider.send("eth_sendTransaction", [{ ...tx }]);
          let hash = await provider.once("message");
          const changes1 = await provider.send("eth_getFilterChanges", [
            filterId
          ]);
          assert.strictEqual(changes1.length, 1);
          await assertNoChanges();
          provider.send("eth_sendTransaction", [{ ...tx }]);
          let hash2 = await provider.once("message");
          provider.send("eth_sendTransaction", [{ ...tx }]);
          let hash3 = await provider.once("message");

          const changes2 = await provider.send("eth_getFilterChanges", [
            filterId
          ]);
          assert.strictEqual(changes2.length, 2);
          await assertNoChanges();

          const allChanges = await provider.send("eth_getFilterLogs", [
            filterId
          ]);
          assert.deepStrictEqual(allChanges, [...changes1, ...changes2]);
        });
      });
    });
  });
});
