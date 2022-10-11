import assert from "assert";
import Common from "@ethereumjs/common";
import {
  TransactionFactory,
  Transaction,
  TypedTransaction
} from "@ganache/ethereum-transaction";
import { EthereumOptionsConfig } from "@ganache/ethereum-options";
import { Heap, Quantity } from "@ganache/utils";
import Wallet from "../src/wallet";
import { byNonce } from "../src/transaction-pool";
import { ExecutableTransactionContainer } from "../src/miner/executables";

describe("executables", async () => {
  describe("cloneAndReset", async () => {
    const executables = new ExecutableTransactionContainer();
    let originalTransactions: TypedTransaction[];
    let clonedTransactions: TypedTransaction[];
    let clone: ExecutableTransactionContainer;

    const getAllTransactionsFromPending = (
      pending: Map<string, Heap<TypedTransaction, any>>
    ) => {
      const transactions: TypedTransaction[] = [];
      for (const [_, heap] of pending) {
        const { length, array } = heap;
        for (let i = 0; i < length; i++) {
          transactions.push(array[i]);
        }
      }
      return transactions;
    };

    beforeEach("set up wallet, accounts, and executables", () => {
      const options = EthereumOptionsConfig.normalize({
        wallet: { deterministic: true }
      });
      const wallet = new Wallet(options.wallet, options.logging);
      const common = Common.forCustomChain(
        "mainnet",
        {
          name: "ganache",
          chainId: 1337,
          comment: "Local test network",
          bootstrapNodes: []
        },
        "london"
      );

      const [from, from2] = wallet.addresses;
      const secretKey = wallet.unlockedAccounts.get(from).toBuffer();
      const secretKey2 = wallet.unlockedAccounts.get(from2).toBuffer();
      const rpcTransaction: Transaction = {
        from,
        type: "0x2",
        maxFeePerGas: "0xffffffff",
        maxPriorityFeePerGas: "0xff",
        gasLimit: "0xffff"
      };

      const { inProgress, pendingByOrigin } = executables;
      // set up the heap to store all pending transactions for the from address
      const heapForFrom = new Heap(byNonce);
      pendingByOrigin.set(from, heapForFrom);
      // we'll add 10 transactions to executables
      for (let i = 0; i < 10; i++) {
        const transaction = TransactionFactory.fromRpc(
          { ...rpcTransaction, nonce: Quantity.toString(i) },
          common
        );
        // make them all "legit"
        transaction.signAndHash(secretKey);
        if (i < 5) {
          // add the first 5 to the in progress queue
          transaction.locked = true;
          inProgress.add(transaction);
        } else {
          // the rest will go in the pending queue
          if (i === 7) {
            // but one will be "locked" (starting to be mined)
            transaction.locked = true;
          }
          heapForFrom.push(transaction);
        }
      }
      // we'll also set up another heap for our second origin
      const heapForFrom2 = new Heap(byNonce);
      pendingByOrigin.set(from2, heapForFrom2);
      const transaction = TransactionFactory.fromRpc(
        { ...rpcTransaction, nonce: "0x0", from: from2 },
        common
      );
      transaction.signAndHash(secretKey2);
      heapForFrom2.push(transaction);

      // finally, clone and reset
      clone = executables.cloneAndReset();
      // and make some data easier to compare in tests
      const { pendingByOrigin: clonedPending } = clone;
      clonedTransactions = getAllTransactionsFromPending(clonedPending);
      originalTransactions = [
        ...Array.from(inProgress),
        ...getAllTransactionsFromPending(pendingByOrigin)
      ];
    });

    it("creates a clone that does not have any `inProgress` transactions ", async () => {
      assert.strictEqual(
        clone.inProgress.size,
        0,
        "Expected cloned `inProgress` pool to have no transactions."
      );
    });

    it("creates a clone that has all of the same transactions as the original", async () => {
      assert.strictEqual(
        clonedTransactions.length,
        originalTransactions.length
      );
      for (const originalTransaction of originalTransactions) {
        const clonedTransaction = clonedTransactions.find(transaction => {
          return transaction.hash === originalTransaction.hash;
        });
        // there is a transaction with the same hash
        assert(clonedTransaction);
      }
    });

    it("creates a clone with each of the transactions being unlocked", async () => {
      for (const transaction of clonedTransactions) {
        assert(
          !transaction.locked,
          "Expected cloned transaction to be unlocked."
        );
      }
    });
  });
});
