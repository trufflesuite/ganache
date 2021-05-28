import assert from "assert";
import EthereumProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import path from "path";

describe("api", () => {
  describe("storageRangeAt", () => {
    describe("DebugStorage", () => {
      let provider: EthereumProvider;
      let accounts: string[];
      let contractAddress: string;
      let blockHash: string;
      let deploymentBlockHash: string;
      let methods: {
        [methodName: string]: string;
      };

      before(async () => {
        provider = await getProvider();
        accounts = await provider.send("eth_accounts");
        const contract = compile(
          path.join(__dirname, "..", "..", "contracts", "DebugStorage.sol")
        );

        const subscriptionId = await provider.send("eth_subscribe", [
          "newHeads"
        ]);

        const deploymentHash = await provider.send("eth_sendTransaction", [
          { from: accounts[0], data: contract.code, gas: 3141592 }
        ]);
        await provider.once("message");

        const deploymentTxReceipt = await provider.send(
          "eth_getTransactionReceipt",
          [deploymentHash]
        );
        contractAddress = deploymentTxReceipt.contractAddress;
        deploymentBlockHash = deploymentTxReceipt.blockHash;

        methods = contract.contract.evm.methodIdentifiers;
        const initialValue =
          "0000000000000000000000000000000000000000000000000000000000000019";

        const transactionHash = await provider.send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: contractAddress,
            gas: 3141592,
            data: `0x${methods["setValue(uint256)"]}${initialValue}`
          }
        ]);
        await provider.once("message");

        const txReceipt = await provider.send("eth_getTransactionReceipt", [
          transactionHash
        ]);
        blockHash = txReceipt.blockHash;

        await provider.send("eth_unsubscribe", [subscriptionId]);
      });

      after(async () => {
        provider && (await provider.disconnect());
      });

      it("should return the storage for the given range", async () => {
        const result = await provider.send("debug_storageRangeAt", [
          blockHash,
          0,
          contractAddress,
          "0x00",
          2
        ]);

        const storage = {
          "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000005"
          },
          "0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000002",
            value:
              "0x68656c6c6f207270647200000000000000000000000000000000000000000014"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(
          result.nextKey,
          "0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6"
        );
      }).timeout(0);

      it("should return only the filled storage slots", async () => {
        const result = await provider.send("debug_storageRangeAt", [
          blockHash,
          0,
          contractAddress,
          "0x00",
          4 // give me 4 entries
        ]);

        // although we asked for a total number of 4 entries, we only have 3
        // and should return the 3 we have
        const storage = {
          "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000005"
          },
          "0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000002",
            value:
              "0x68656c6c6f207270647200000000000000000000000000000000000000000014"
          },
          "0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000001",
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000001"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(result.nextKey, null);
      });

      it("should return account doesn't exist error when debugging a deployment transaction", async () => {
        const message = `account ${contractAddress} doesn't exist`;
        await assert.rejects(
          provider.send("debug_storageRangeAt", [
            deploymentBlockHash,
            0,
            contractAddress,
            "0x00",
            2
          ]),
          { message }
        );
      });

      it("should accept a nextKey as the startKey for the given range", async () => {
        const result = await provider.send("debug_storageRangeAt", [
          blockHash,
          0,
          contractAddress,
          "0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace",
          2
        ]);

        const storage = {
          "0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000002",
            value:
              "0x68656c6c6f207270647200000000000000000000000000000000000000000014"
          },
          "0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000001",
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000001"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(result.nextKey, null);
      });

      it("should accept a nextKey as the startKey for the given range AND provide correct nextKey", async () => {
        const result = await provider.send("debug_storageRangeAt", [
          blockHash,
          0,
          contractAddress,
          "0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace",
          1
        ]);

        const storage = {
          "0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000002",
            value:
              "0x68656c6c6f207270647200000000000000000000000000000000000000000014"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(
          result.nextKey,
          "0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6"
        );
      });

      it("should return correct storage given an arbitrary hexadecimal value for startKey", async () => {
        const result = await provider.send("debug_storageRangeAt", [
          blockHash,
          0,
          contractAddress,
          "0x290f",
          3
        ]);

        const storage = {
          "0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000002",
            value:
              "0x68656c6c6f207270647200000000000000000000000000000000000000000014"
          },
          "0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000001",
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000001"
          }
        };
        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(result.nextKey, null);
      });

      it("should return correct storage given a different arbitrary hexadecimal value for startKey", async () => {
        const result = await provider.send("debug_storageRangeAt", [
          blockHash,
          0,
          contractAddress,
          "0x290c",
          3
        ]);

        const storage = {
          "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000000",
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000005"
          },
          "0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000002",
            value:
              "0x68656c6c6f207270647200000000000000000000000000000000000000000014"
          },
          "0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000001",
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000001"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(result.nextKey, null);
      });

      it("should return correct storage given different transaction indexes", async () => {
        /* 
          Strategy for this test:
            1. Create snapshot
            2. Call miner.stop() so we can send a few transactions
            3. Call miner.start() so we can mine all of the txs in a single block
            4. Call debug_storageRangeAt for each transaction using the transaction index
            5. Assert that the result will be the value we think it is in storage
            6. Revert snapshot
        */

        const snapshotId = await provider.send("evm_snapshot");

        try {
          await provider.send("eth_subscribe", ["newHeads"]);
          await provider.send("miner_stop");

          const [tx1, tx2, tx3] = await Promise.all([
            provider.send("eth_sendTransaction", [
              {
                from: accounts[0],
                to: contractAddress,
                gas: 3141592,
                data: `0x${methods["setValue(uint256)"]}0000000000000000000000000000000000000000000000000000000000000001`
              }
            ]),
            provider.send("eth_sendTransaction", [
              {
                from: accounts[0],
                to: contractAddress,
                gas: 3141592,
                data: `0x${methods["setValue(uint256)"]}0000000000000000000000000000000000000000000000000000000000000002`
              }
            ]),
            provider.send("eth_sendTransaction", [
              {
                from: accounts[0],
                to: contractAddress,
                gas: 3141592,
                data: `0x${methods["setValue(uint256)"]}0000000000000000000000000000000000000000000000000000000000000003`
              }
            ])
          ]);

          await provider.send("miner_start");
          await provider.once("message");

          const [txReceipt1, txReceipt2, txReceipt3] = await Promise.all([
            provider.send("eth_getTransactionReceipt", [tx1]),
            provider.send("eth_getTransactionReceipt", [tx2]),
            provider.send("eth_getTransactionReceipt", [tx3])
          ]);

          // all 3 txs should now be in the same block
          assert.strictEqual(txReceipt1.blockHash, txReceipt2.blockHash);
          assert.strictEqual(txReceipt1.blockHash, txReceipt3.blockHash);

          const [resultForTx1, resultForTx2, resultForTx3] = await Promise.all([
            provider.send("debug_storageRangeAt", [
              txReceipt1.blockHash,
              txReceipt1.transactionIndex, // 0
              contractAddress,
              "0x00",
              1
            ]),
            await provider.send("debug_storageRangeAt", [
              txReceipt2.blockHash,
              txReceipt2.transactionIndex, // 1
              contractAddress,
              "0x00",
              1
            ]),
            provider.send("debug_storageRangeAt", [
              txReceipt3.blockHash,
              txReceipt3.transactionIndex, // 2
              contractAddress,
              "0x00",
              1
            ])
          ]);

          assert.deepStrictEqual(resultForTx1.storage, {
            "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563": {
              key:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
              value:
                "0x0000000000000000000000000000000000000000000000000000000000000019"
            }
          });
          assert.deepStrictEqual(resultForTx2.storage, {
            "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563": {
              key:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
              value:
                "0x0000000000000000000000000000000000000000000000000000000000000001"
            }
          });
          assert.deepStrictEqual(resultForTx3.storage, {
            "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563": {
              key:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
              value:
                "0x0000000000000000000000000000000000000000000000000000000000000002"
            }
          });
        } finally {
          await provider.send("evm_revert", [snapshotId]);
        }
      });

      it("should throw an error for transaction indexes out of range", async () => {
        const message = `transaction index 3 is out of range for block ${blockHash}`;
        await assert.rejects(
          provider.send("debug_storageRangeAt", [
            blockHash,
            3, // txIndex out of range
            contractAddress,
            "0x00",
            2
          ]),
          { message }
        );
      });
    });

    describe("DebugComplexStorage", () => {
      let provider: EthereumProvider;
      let accounts: string[];
      let contractAddress: string;
      let blockHash: string;

      before(async () => {
        provider = await getProvider();
        accounts = await provider.send("eth_accounts", []);
        const contract = compile(
          path.join(
            __dirname,
            "..",
            "..",
            "contracts",
            "DebugComplexStorage.sol"
          )
        );

        const subscriptionId = await provider.send("eth_subscribe", [
          "newHeads"
        ]);

        const deploymentHash = await provider.send("eth_sendTransaction", [
          {
            from: accounts[0],
            data: contract.code,
            gas: `0x${(3141592).toString(16)}`
          }
        ]);
        await provider.once("message");

        const deploymentTxReceipt = await provider.send(
          "eth_getTransactionReceipt",
          [deploymentHash.toString()]
        );
        contractAddress = deploymentTxReceipt.contractAddress;

        const methods = contract.contract.evm.methodIdentifiers;
        const initialValue =
          "0000000000000000000000000000000000000000000000000000000000000019";

        const transactionHash = await provider.send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: contractAddress,
            gas: 3141592,
            data: `0x${methods["setValue(uint)"]}${initialValue}`
          }
        ]);
        await provider.once("message");

        const txReceipt = await provider.send("eth_getTransactionReceipt", [
          transactionHash
        ]);
        blockHash = txReceipt.blockHash;

        await provider.send("eth_unsubscribe", [subscriptionId]);
      });

      after(async () => {
        provider && (await provider.disconnect());
      });

      it("should return the storage for the given range", async () => {
        const result = await provider.send("debug_storageRangeAt", [
          blockHash,
          0,
          contractAddress,
          "0x00",
          2
        ]);

        const storage = {
          "0x0175b7a638427703f0dbe7bb9bbf987a2551717b34e79f33b5b1008d1fa01db9": {
            key:
              "0x000000000000000000000000000000000000000000000000000000000000000b",
            value:
              "0x776561724c6576656c3300000000000000000000000000000000000000000014"
          },
          "0x0ad2b1b513cb2993be7f47396bf45627c5f483cf774fd5875730b55a1dbcc856": {
            key:
              "0x720c187f2880b2567f9fccc279625ea13024b8b82a6f73e26d9ca6d82ede1cc7",
            value:
              "0x776561724c6576656c0000000000000000000000000000000000000000000012"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(
          result.nextKey,
          "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563"
        );
      });

      it("should return only the filled storage slots", async () => {
        const result = await provider.send("debug_storageRangeAt", [
          blockHash,
          0,
          contractAddress,
          "0xf3f7a9fe364faab93b216da50a3214154f22a0a2b415b23a84c8169e8b636ee3",
          4 // give me 4 entries
        ]);

        // although we asked for a total number of 4 entries, we only have 1
        // left at this point so that's the only one we should see
        const storage = {
          "0xf3f7a9fe364faab93b216da50a3214154f22a0a2b415b23a84c8169e8b636ee3": {
            key:
              "0x0000000000000000000000000000000000000000000000000000000000000008",
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000002"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(result.nextKey, null);
      });
    });
  });
});
