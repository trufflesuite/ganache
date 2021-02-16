import { WEI } from "@ganache/utils";
import assert from "assert";
import { join } from "path";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";

const eth = "0x" + WEI.toString(16);

describe("api", () => {
  describe("evm", () => {
    describe("snapshot / revert", () => {
      let context = {} as any;
      let startingBalance;
      let snapshotId;

      beforeEach("Set up provider and deploy a contract", async () => {
        const contract = compile(join(__dirname, "./snapshot.sol"));

        const p = await getProvider({
          miner: { defaultTransactionGasLimit: 6721975 }
        });
        const accounts = await p.send("eth_accounts");
        const from = accounts[3];

        await p.send("eth_subscribe", ["newHeads"]);

        const transactionHash = await p.send("eth_sendTransaction", [
          {
            from,
            data: contract.code
          }
        ]);

        await p.once("message");

        const receipt = await p.send("eth_getTransactionReceipt", [
          transactionHash
        ]);
        assert.strictEqual(receipt.blockNumber, "0x1");

        const to = receipt.contractAddress;
        const methods = contract.contract.evm.methodIdentifiers;

        context.send = p.send.bind(p);
        context.accounts = accounts;
        context.provider = p;
        context.instance = {
          n: () => {
            const tx = {
              to,
              data: "0x" + methods["n()"]
            };
            return p.send("eth_call", [tx]);
          },
          inc: async (tx: any) => {
            tx.from ||= accounts[0];
            tx.to = to;
            tx.data = "0x" + methods["inc()"];
            const hash = await p.send("eth_sendTransaction", [tx]);
            await p.once("message");
            return await p.send("eth_getTransactionByHash", [hash]);
          }
        };
      });

      beforeEach("send a transaction then make a checkpoint", async () => {
        const { accounts, send, provider } = context;

        await send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: accounts[1],
            value: eth,
            gas: 90000
          }
        ]);

        await provider.once("message");

        // Since transactions happen immediately, we can assert the balance.
        let balance = await send("eth_getBalance", [accounts[0]]);
        balance = BigInt(balance);

        // Assert the starting balance is where we think it is, including tx costs.
        assert(
          balance > 990000000000000000000n && balance < 999000000000000000000n
        );
        startingBalance = balance;

        // Now checkpoint.
        snapshotId = await send("evm_snapshot");
      });

      it("rolls back successfully", async () => {
        const { accounts, send, provider } = context;

        // Send another transaction, check the balance, then roll it back to the old one and check the balance again.
        const transactionHash = await send("eth_sendTransaction", [
          {
            from: accounts[0],
            to: accounts[1],
            value: eth,
            gas: 90000
          }
        ]);

        await provider.once("message");

        let balance = await send("eth_getBalance", [accounts[0]]);
        balance = BigInt(balance);

        // Assert the starting balance is where we think it is, including tx costs.
        assert(
          balance > 980000000000000000000n && balance < 998000000000000000000n
        );

        const status = await send("evm_revert", [snapshotId]);

        assert(status, "Snapshot should have returned true");

        let revertedBalance = await send("eth_getBalance", [accounts[0]]);
        revertedBalance = BigInt(revertedBalance);

        assert(
          revertedBalance === startingBalance,
          "Should have reverted back to the starting balance"
        );

        const oldReceipt = await send("eth_getTransactionReceipt", [
          transactionHash
        ]);
        assert.strictEqual(
          oldReceipt,
          null,
          "Receipt should be null as it should have been removed"
        );
      });

      it("returns false when reverting a snapshot that doesn't exist", async () => {
        const { send } = context;

        const snapShotId1 = await send("evm_snapshot");
        const snapShotId2 = await send("evm_snapshot");
        const response1 = await send("evm_revert", [snapShotId1]);
        assert.strictEqual(
          response1,
          true,
          "Reverting a snapshot that exists does not work"
        );
        const response2 = await send("evm_revert", [snapShotId2]);
        assert.strictEqual(
          response2,
          false,
          "Reverting a snapshot that no longer exists does not work"
        );
        const response3 = await send("evm_revert", [snapShotId1]);
        assert.strictEqual(
          response3,
          false,
          "Reverting a snapshot that hasn't already been reverted does not work"
        );
        const response4 = await send("evm_revert", [999]);
        assert.strictEqual(
          response4,
          false,
          "Reverting a snapshot that has never existed does not work"
        );
      });

      it("checkpoints and reverts without persisting contract storage", async () => {
        const { accounts, instance, send } = context;

        const snapShotId = await send("evm_snapshot");
        const n1 = await instance.n();
        assert.strictEqual(parseInt(n1), 42, "Initial n is not 42");

        await instance.inc({ from: accounts[0] });
        const n2 = await instance.n();
        assert.strictEqual(
          parseInt(n2),
          43,
          "n is not 43 after first call to `inc`"
        );

        await send("evm_revert", [snapShotId]);
        const n3 = await instance.n();
        assert.strictEqual(
          parseInt(n3),
          42,
          "n is not 42 after reverting snapshot"
        );

        // this is the real test. what happened was that the vm's contract storage
        // trie cache wasn't cleared when the vm's stateManager cache was cleared.
        await instance.inc({ from: accounts[0] });
        const n4 = await instance.n();
        assert.strictEqual(
          parseInt(n4),
          43,
          "n is not 43 after calling `inc` again"
        );
      });

      it("evm_revert rejects invalid subscriptionId types without crashing", async () => {
        const { send } = context;
        const ids = [{ foo: "bar" }, true, false, 0.5, Infinity, -Infinity];
        await Promise.all(
          ids.map(id =>
            assert.rejects(
              send("evm_revert", [id]),
              /Cannot wrap a .+? as a json-rpc type/,
              "evm_revert did not reject as expected"
            )
          )
        );
      });

      it("evm_revert rejects null/undefined subscriptionId values", async () => {
        const { send } = context;
        const ids = [null, undefined];
        await Promise.all(
          ids.map(id =>
            assert.rejects(
              send("evm_revert", [id]),
              /invalid snapshotId/,
              "evm_revert did not reject as expected"
            )
          )
        );
      });

      it("evm_revert returns false for out-of-range subscriptionId values", async () => {
        const { send } = context;
        const ids = [-1, Buffer.from([0])];
        const promises = ids.map(id =>
          send("evm_revert", [id]).then(result =>
            assert.strictEqual(result, false)
          )
        );
        await Promise.all(promises);
      });

      it("removes transactions that are already in processing at the start of evm_revert", async () => {
        const {
          send,
          accounts: [from, to]
        } = context;

        const snapShotId = await send("evm_snapshot");

        // increment value for each transaction so the hashes always differ
        let value = 1;

        // send some transactions
        const inFlightTxs = [
          send("eth_sendTransaction", [{ from, to, value: value++ }]),
          send("eth_sendTransaction", [{ from, to, value: value++ }])
        ];
        // wait for the tx hashes to be returned; this is confirmation that
        // they've been accepted by the transaction pool.
        const txHashes = await Promise.all(inFlightTxs);

        const getReceipt = (hash: string) =>
          send("eth_getTransactionReceipt", [hash]);
        const getTx = (hash: string) =>
          send("eth_getTransactionByHash", [hash]);

        const receiptsProm = Promise.all(txHashes.map(getReceipt));
        const transactionsProm = Promise.all(txHashes.map(getTx));
        const [receipts, transactions] = await Promise.all([
          receiptsProm,
          transactionsProm
        ]);

        // sometimes ganache is REALLY fast and mines and saves the first tx
        // before we even get here (which is fine). As long as we have tx that
        // is still pending (meaning its receipt is `null`) the test is still
        // testing what we want it to.
        assert.strictEqual(
          receipts.some(r => r === null),
          true,
          "At least 1 receipt should be null"
        );

        // and that the transactions were all accepted
        transactions.forEach(transaction => {
          assert.notStrictEqual(
            transaction,
            null,
            "Transaction should not be null"
          );
        });

        // revert while these transactions are being mined
        await send("evm_revert", [snapShotId]);

        const finalReceiptsProm = Promise.all(txHashes.map(getReceipt));
        const finalTransactionsProm = Promise.all(txHashes.map(getTx));
        const [finalReceipts, finalTransactions] = await Promise.all([
          finalReceiptsProm,
          finalTransactionsProm
        ]);

        // verify that we don't have any receipts
        finalReceipts.forEach(receipt => {
          assert.strictEqual(receipt, null, "Receipt should be null");
        });

        // and we don't have any transactions
        finalTransactions.forEach(transaction => {
          assert.strictEqual(transaction, null, "Transaction should be null");
        });
      });

      it("removes transactions that are in pending transactions at the start of evm_revert", async () => {
        const {
          provider,
          send,
          accounts: [from, to]
        } = context;

        const snapShotId = await send("evm_snapshot");

        // increment value for each transaction so the hashes always differ
        let value = 1;

        // send some transactions
        const accountNonce = parseInt(
          await send("eth_getTransactionCount", [from]),
          16
        );
        const inFlightTxs = [
          send("eth_sendTransaction", [
            { from, to, value: value++, nonce: accountNonce + 1 }
          ]),
          send("eth_sendTransaction", [
            { from, to, value: value++, nonce: accountNonce + 2 }
          ])
        ];
        // wait for the tx hashes to be returned; this is confirmation that
        // they've been accepted by the transaction pool.
        const txHashes = await Promise.all(inFlightTxs);

        const getReceipt = (hash: string) =>
          send("eth_getTransactionReceipt", [hash]);
        const getTx = (hash: string) =>
          send("eth_getTransactionByHash", [hash]);

        const transactions = await Promise.all(txHashes.map(getTx));

        // and that the transactions were all accepted
        transactions.forEach(transaction => {
          assert.notStrictEqual(
            transaction,
            null,
            "Transaction should not be null"
          );
        });

        // revert while these transactions are pending
        await send("evm_revert", [snapShotId]);

        // mine a transaction to fill in the nonce gap (this would normally cause the pending transactions to be mined)
        await send("eth_sendTransaction", [
          { from, to, value: value++, nonce: accountNonce }
        ]);
        await provider.once("message");

        // and mine one more block just to force the any transactions to be immediately mined
        await send("evm_mine");

        const finalReceiptsProm = Promise.all(txHashes.map(getReceipt));
        const finalTransactionsProm = Promise.all(txHashes.map(getTx));
        const [finalReceipts, finalTransactions] = await Promise.all([
          finalReceiptsProm,
          finalTransactionsProm
        ]);

        // verify that we don't have any receipts
        finalReceipts.forEach(receipt => {
          assert.strictEqual(receipt, null, "Receipt should be null");
        });

        // and we don't have any transactions
        finalTransactions.forEach(transaction => {
          assert.strictEqual(transaction, null, "Transaction should be null");
        });
      });

      it("doesn't revert transactions that were added *after* the start of evm_revert", async () => {
        const {
          provider,
          send,
          accounts: [from, to]
        } = context;
        const accountNonce = parseInt(
          await send("eth_getTransactionCount", [from]),
          16
        );
        const snapShotId = await send("evm_snapshot");

        // increment value for each transaction so the hashes always differ
        let value = 1;

        // send a transaction so we have something to revert
        const revertedTx = await send("eth_sendTransaction", [
          { from, to, value: value++ }
        ]);
        await provider.once("message");

        // revert while these transactions are being mined
        const revertPromise = send("evm_revert", [snapShotId]);

        const txsMinedProm = new Promise(resolve => {
          let count = 0;
          const unsubscribe = provider.on("message", _ => {
            if (++count === 2) {
              unsubscribe();
              resolve(null);
            }
          });
        });

        // send some transactions
        const inFlightTxs = [
          send("eth_sendTransaction", [{ from, to, value: value++ }]),
          send("eth_sendTransaction", [{ from, to, value: value++ }])
        ];

        // these two transactions have nonces that are too high to be executed immediately
        const laterTxs = [
          send("eth_sendTransaction", [
            { from, to, value: value++, nonce: accountNonce + 3 }
          ]),
          send("eth_sendTransaction", [
            { from, to, value: value++, nonce: accountNonce + 3 }
          ])
        ];

        // wait for the tx hashes to be returned; this is confirmation that
        // they've been accepted by the transaction pool.
        const txHashPromises = Promise.all(inFlightTxs);

        const getReceipt = (hash: string) =>
          send("eth_getTransactionReceipt", [hash]);
        const getTx = (hash: string) =>
          send("eth_getTransactionByHash", [hash]);

        // wait for the revert to finish up
        const result = await Promise.race([revertPromise, txHashPromises]);
        assert.strictEqual(
          result,
          true,
          "evm_revert should finish before the transaction hashes are returned"
        );

        // wait for the inFlightTxs to be mined
        await txsMinedProm;
        const txHashes = await txHashPromises;
        const laterHashes = await Promise.all(laterTxs);

        // and mine one more block just to force the any executable transactions
        // to be immediately mined

        const gotTxsProm = new Promise(resolve => {
          let count = 0;
          const unsubscribe = provider.on("message", m => {
            if (++count === 3) {
              unsubscribe();
              resolve(null);
            }
          });
        });

        await send("evm_mine");

        const finalReceiptsProm = Promise.all(txHashes.map(getReceipt));
        const finalTransactionsProm = Promise.all(txHashes.map(getTx));
        const [finalReceipts, finalTransactions] = await Promise.all([
          finalReceiptsProm,
          finalTransactionsProm
        ]);

        // verify that we do have the receipts
        finalReceipts.forEach(receipt => {
          assert.notStrictEqual(receipt, null, "Receipt should not be null");
        });

        // and we do have the transactions
        finalTransactions.forEach(transaction => {
          assert.notStrictEqual(
            transaction,
            null,
            "Transaction should not be null"
          );
        });

        const laterTxsReceiptsProm = Promise.all(laterHashes.map(getReceipt));
        const laterTxsTransactionsProm = Promise.all(laterHashes.map(getTx));
        const [laterTxsReceipts, laterTxsTransactions] = await Promise.all([
          laterTxsReceiptsProm,
          laterTxsTransactionsProm
        ]);

        // verify that we do NOT have the receipts
        laterTxsReceipts.forEach(receipt => {
          assert.strictEqual(receipt, null, "Receipt should be null");
        });

        // and we DO have the transactions
        laterTxsTransactions.forEach(transaction => {
          assert.notStrictEqual(
            transaction,
            null,
            "Transaction should not be null"
          );
        });

        // send one more transaction to fill in the gap
        send("eth_sendTransaction", [{ from, to, value: value++ }]);
        await gotTxsProm;

        const finalLaterTxsReceiptsProm = Promise.all(txHashes.map(getReceipt));
        const finalLaterTxsTransactionsProm = Promise.all(txHashes.map(getTx));
        const [
          finalLaterTxsReceipts,
          finalLaterTxsTransactions
        ] = await Promise.all([
          finalLaterTxsReceiptsProm,
          finalLaterTxsTransactionsProm
        ]);

        // verify that we do have the receipts
        finalLaterTxsReceipts.forEach(receipt => {
          assert.notStrictEqual(receipt, null, "Receipt should not be null");
        });

        // and we do have the transactions
        finalLaterTxsTransactions.forEach(transaction => {
          assert.notStrictEqual(
            transaction,
            null,
            "Transaction should not be null"
          );
        });

        const revertedTxReceipt = await getReceipt(revertedTx);
        const revertedTxTransactions = await getTx(revertedTx);
        assert.strictEqual(
          revertedTxReceipt,
          null,
          "First transaction should not have a receipt"
        );
        assert.strictEqual(
          revertedTxTransactions,
          null,
          "First transaction should not have a tx"
        );
      });
    });
  });
});
