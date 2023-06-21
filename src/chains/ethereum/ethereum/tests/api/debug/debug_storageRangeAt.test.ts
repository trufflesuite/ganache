import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import { join } from "path";

const VALUE1_KEY = {
  hashKey: "0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563",
  key: "0x0000000000000000000000000000000000000000000000000000000000000000"
};
const VALUE2_KEY = {
  hashKey: "0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6",
  key: "0x0000000000000000000000000000000000000000000000000000000000000001"
};
const VALUE3_KEY = {
  hashKey: "0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace",
  key: "0x0000000000000000000000000000000000000000000000000000000000000002"
};
const VALUE4_KEY = {
  hashKey: "0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b",
  key: "0x0000000000000000000000000000000000000000000000000000000000000003"
};

describe("api", () => {
  describe("storageRangeAt", () => {
    let provider: EthereumProvider;
    let contractAddress: string;
    let from: string;
    let methods: {
      [methodName: string]: string;
    };

    const updateValue = async (method: string, hexValue: string) =>
      await provider.send("eth_sendTransaction", [
        {
          from,
          to: contractAddress,
          gas: "0x2fefd8",
          data: `0x${methods[method]}${hexValue.padStart(64, "0")}`
        }
      ]);

    const debugStorage = async (
      blockHash: string,
      transactionIndex: number,
      maxResults: number = 5,
      start: string = "0x00"
    ) =>
      await provider.send("debug_storageRangeAt", [
        blockHash,
        transactionIndex,
        contractAddress,
        start,
        maxResults
      ]);

    const compileContract = (contractName: string) =>
      compile(join(__dirname, "..", "..", "contracts", contractName));

    describe("DebugStorage", () => {
      let blockHash: string;
      let deploymentBlockHash: string;

      before("set up provider and contract", async () => {
        provider = await getProvider();
        [from] = await provider.send("eth_accounts");
        const contract = compileContract("DebugStorage.sol");

        const subscriptionId = await provider.send("eth_subscribe", [
          "newHeads"
        ]);

        const deploymentHash = await provider.send("eth_sendTransaction", [
          { from, data: contract.code, gas: "0x2fefd8" }
        ]);
        await provider.once("message");

        const deploymentTxReceipt = await provider.send(
          "eth_getTransactionReceipt",
          [deploymentHash]
        );
        contractAddress = deploymentTxReceipt.contractAddress;
        deploymentBlockHash = deploymentTxReceipt.blockHash;

        methods = contract.contract.evm.methodIdentifiers;

        const transactionHash = await updateValue("setValue(uint256)", "19");
        await provider.once("message");

        ({ blockHash } = await provider.send("eth_getTransactionReceipt", [
          transactionHash
        ]));

        await provider.send("eth_unsubscribe", [subscriptionId]);
      });

      after("shut down provider", async () => {
        provider && (await provider.disconnect());
      });

      it("should return the storage for the given range", async () => {
        const result = await debugStorage(blockHash, 0, 2);

        const storage = {
          [VALUE1_KEY.hashKey]: {
            key: VALUE1_KEY.key,
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000005"
          },
          [VALUE3_KEY.hashKey]: {
            key: VALUE3_KEY.key,
            value:
              "0x68656c6c6f20776f726c64000000000000000000000000000000000000000016"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(result.nextKey, VALUE2_KEY.hashKey);
      });

      it("should return only the filled storage slots", async () => {
        const result = await debugStorage(blockHash, 0, 4); // give me 4 entries

        // although we asked for a total number of 4 entries, we only have 3
        // and should return the 3 we have
        const storage = {
          [VALUE1_KEY.hashKey]: {
            key: VALUE1_KEY.key,
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000005"
          },
          [VALUE2_KEY.hashKey]: {
            key: VALUE2_KEY.key,
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000001"
          },
          [VALUE3_KEY.hashKey]: {
            key: VALUE3_KEY.key,
            value:
              "0x68656c6c6f20776f726c64000000000000000000000000000000000000000016"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(result.nextKey, null);
      });

      it("should return account doesn't exist error when debugging a deployment transaction", async () => {
        const message = `account ${contractAddress} doesn't exist`;
        await assert.rejects(debugStorage(deploymentBlockHash, 0, 2), {
          message
        });
      });

      it("should accept a nextKey as the startKey for the given range", async () => {
        const result = await debugStorage(blockHash, 0, 2, VALUE3_KEY.hashKey);

        const storage = {
          [VALUE3_KEY.hashKey]: {
            key: VALUE3_KEY.key,
            value:
              "0x68656c6c6f20776f726c64000000000000000000000000000000000000000016"
          },
          [VALUE2_KEY.hashKey]: {
            key: VALUE2_KEY.key,
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000001"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(result.nextKey, null);
      });

      it("should accept a nextKey as the startKey for the given range AND provide correct nextKey", async () => {
        const result = await debugStorage(blockHash, 0, 1, VALUE3_KEY.hashKey);

        const storage = {
          [VALUE3_KEY.hashKey]: {
            key: VALUE3_KEY.key,
            value:
              "0x68656c6c6f20776f726c64000000000000000000000000000000000000000016"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        // value2.raw sorts _after_ value3.raw, so it is the `nextKey`
        assert.strictEqual(result.nextKey, VALUE2_KEY.hashKey);
      });

      it("should return correct storage given an arbitrary hexadecimal value for startKey", async () => {
        // the start key, 0x290f, sorts _after_ value1.raw, so value1 is _not_ included in the result.
        const result = await debugStorage(blockHash, 0, 3, "0x290f");

        const storage = {
          [VALUE3_KEY.hashKey]: {
            key: VALUE3_KEY.key,
            value:
              "0x68656c6c6f20776f726c64000000000000000000000000000000000000000016"
          },
          [VALUE2_KEY.hashKey]: {
            key: VALUE2_KEY.key,
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000001"
          }
        };
        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(result.nextKey, null);
      });

      it("should return correct storage given a different arbitrary hexadecimal value for startKey", async () => {
        // the start key, 0x290c, sorts _before_ value1.raw, so value1 _is_ still included in the result.
        const result = await debugStorage(blockHash, 0, 3, "0x290c");

        const storage = {
          [VALUE1_KEY.hashKey]: {
            key: VALUE1_KEY.key,
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000005"
          },
          [VALUE3_KEY.hashKey]: {
            key: VALUE3_KEY.key,
            value:
              "0x68656c6c6f20776f726c64000000000000000000000000000000000000000016"
          },
          [VALUE2_KEY.hashKey]: {
            key: VALUE2_KEY.key,
            value:
              "0x0000000000000000000000000000000000000000000000000000000000000001"
          }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(result.nextKey, null);
      });

      it("should return correct storage given different storage slot changes at different transaction indexes in same block", async () => {
        /* 
          Strategy for this test:
            1. Create snapshot
            2. Call miner.stop() so we can send a few transactions
            3. Send a transaction that changes an existing value.
            4. Send a transaction that sets a value for the first time.
            5. Send a transaction that changes an existing value again.
            6. Call miner.start() so we can mine all of the txs in a single block
            7. Call debug_storageRangeAt for each transaction using the transaction index
            8. Assert that the results will return the correct values:
              * storageRange at 1st transaction should not return its own changes.
              * storageRange at 2nd transaction returns 1st transaction's changes, but not its own.
              * storageRange at 3rd transaction returns 1st and 2nd transaction's changes, but not its own.
            9. Revert snapshot
        */

        const snapshotId = await provider.send("evm_snapshot");

        try {
          await provider.send("eth_subscribe", ["newHeads"]);
          await provider.send("miner_stop");

          const [tx1, tx2, tx3] = await Promise.all([
            // change an existing value (at value1)
            updateValue("setValue(uint256)", "1"),
            // set a value for the first time (at *value4*)
            updateValue("setValue4(uint256)", "1337"),
            // change an existing value (at value1)
            updateValue("setValue(uint256)", "2")
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

          const [storageAtTx1, storageAtTx2, storageAtTx3] = await Promise.all([
            debugStorage(txReceipt1.blockHash, +txReceipt1.transactionIndex),
            debugStorage(txReceipt2.blockHash, +txReceipt2.transactionIndex),
            debugStorage(txReceipt3.blockHash, +txReceipt3.transactionIndex)
          ]);

          assert.deepStrictEqual(
            storageAtTx1.storage,
            {
              [VALUE1_KEY.hashKey]: {
                key: VALUE1_KEY.key,
                value: `0x${"19".padStart(64, "0")}`
              },
              [VALUE2_KEY.hashKey]: {
                key: VALUE2_KEY.key,
                value: `0x${"1".padStart(64, "0")}`
              },
              [VALUE3_KEY.hashKey]: {
                key: VALUE3_KEY.key,
                value:
                  "0x68656c6c6f20776f726c64000000000000000000000000000000000000000016"
              }
            },
            "transaction at index 0 produced incorrect trace"
          );
          assert.deepStrictEqual(
            storageAtTx2.storage,
            {
              [VALUE1_KEY.hashKey]: {
                key: VALUE1_KEY.key,
                value:
                  "0x0000000000000000000000000000000000000000000000000000000000000001"
              },
              [VALUE2_KEY.hashKey]: {
                key: VALUE2_KEY.key,
                value:
                  "0x0000000000000000000000000000000000000000000000000000000000000001"
              },
              [VALUE3_KEY.hashKey]: {
                key: VALUE3_KEY.key,
                value:
                  "0x68656c6c6f20776f726c64000000000000000000000000000000000000000016"
              }
            },
            "transaction at index 1 produced incorrect trace"
          );
          assert.deepStrictEqual(
            storageAtTx3.storage,
            {
              [VALUE1_KEY.hashKey]: {
                key: VALUE1_KEY.key,
                value:
                  "0x0000000000000000000000000000000000000000000000000000000000000001"
              },
              [VALUE2_KEY.hashKey]: {
                key: VALUE2_KEY.key,
                value:
                  "0x0000000000000000000000000000000000000000000000000000000000000001"
              },
              [VALUE3_KEY.hashKey]: {
                key: VALUE3_KEY.key,
                value:
                  "0x68656c6c6f20776f726c64000000000000000000000000000000000000000016"
              },
              [VALUE4_KEY.hashKey]: {
                key: VALUE4_KEY.key,
                value:
                  "0x0000000000000000000000000000000000000000000000000000000000001337"
              }
            },
            "transaction at index 2 produces incorrect trace"
          );
        } finally {
          await provider.send("evm_revert", [snapshotId]);
        }
      });

      it("should throw an error for transaction indexes out of range", async () => {
        const message = `transaction index 3 is out of range for block ${blockHash}`;
        // txIndex out of range
        await assert.rejects(debugStorage(blockHash, 3, 2), { message });
      });

      it("throws with a forked network", async () => {
        const fakeMainnet = await getProvider();
        const forkedProvider = await getProvider({
          fork: { provider: fakeMainnet as any }
        });
        const error = new Error(
          "debug_storageRangeAt is not supported on a forked network. See https://github.com/trufflesuite/ganache/issues/3488 for details."
        );

        await assert.rejects(
          forkedProvider.send("debug_storageRangeAt", [
            blockHash,
            0,
            contractAddress,
            "0x00",
            1
          ]),
          error
        );
      });
    });

    describe("DebugComplexStorage", () => {
      let blockHash: string;

      before("set up provider and contract", async () => {
        provider = await getProvider();
        [from] = await provider.send("eth_accounts");
        const contract = compileContract("DebugComplexStorage.sol");

        const subscriptionId = await provider.send("eth_subscribe", [
          "newHeads"
        ]);

        const deploymentHash = await provider.send("eth_sendTransaction", [
          { from, data: contract.code, gas: "0x2fefd8" }
        ]);
        await provider.once("message");

        ({ contractAddress } = await provider.send(
          "eth_getTransactionReceipt",
          [deploymentHash]
        ));

        methods = contract.contract.evm.methodIdentifiers;

        const transactionHash = await updateValue("setValue(uint256)", "19");
        await provider.once("message");

        ({ blockHash } = await provider.send("eth_getTransactionReceipt", [
          transactionHash
        ]));

        await provider.send("eth_unsubscribe", [subscriptionId]);
      });

      after("shut down provider", async () => {
        provider && (await provider.disconnect());
      });

      it("should return the storage for the given range", async () => {
        const result = await debugStorage(blockHash, 0, 2);

        const storage = {
          "0x0175b7a638427703f0dbe7bb9bbf987a2551717b34e79f33b5b1008d1fa01db9":
            {
              key: "0x000000000000000000000000000000000000000000000000000000000000000b",
              value:
                "0x776561724c6576656c3300000000000000000000000000000000000000000014"
            },
          "0x0ad2b1b513cb2993be7f47396bf45627c5f483cf774fd5875730b55a1dbcc856":
            {
              key: "0x720c187f2880b2567f9fccc279625ea13024b8b82a6f73e26d9ca6d82ede1cc7",
              value:
                "0x776561724c6576656c0000000000000000000000000000000000000000000012"
            }
        };

        assert.deepStrictEqual(result.storage, storage);
        assert.strictEqual(result.nextKey, VALUE1_KEY.hashKey);
      });

      it("should return only the filled storage slots", async () => {
        const startKey =
          "0xf3f7a9fe364faab93b216da50a3214154f22a0a2b415b23a84c8169e8b636ee3";
        // give me 4 entries
        const result = await debugStorage(blockHash, 0, 4, startKey);

        // although we asked for a total number of 4 entries, we only have 1
        // left at this point so that's the only one we should see
        const storage = {
          [startKey]: {
            key: "0x0000000000000000000000000000000000000000000000000000000000000008",
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
