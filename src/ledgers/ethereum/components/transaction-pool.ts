import Emittery from "emittery";
import Blockchain from "../blockchain";
import Heap from "../../../utils/heap";
import Transaction from "../../../types/transaction";
import { Data, Quantity } from "../../../types/json-rpc";

export type TransactionPoolOptions = {
  /**
   * TODO: use this value.
   */
  gasPrice?: Quantity,

  /**
   * Minimum gas price to enforce for acceptance into the pool
   */
  gasLimit?: Quantity
};

function byNonce(values: Transaction[], a: number, b: number) {
  return (Quantity.from(values[b].nonce).toBigInt() || 0n) > (Quantity.from(values[a].nonce).toBigInt() || 0n);
}

export default class TransactionPool extends Emittery {
  private options: TransactionPoolOptions;

  /**
   * Minimum price bump percentage to replace an already existing transaction (nonce)
   */
  public priceBump: bigint = 10n

  private blockchain: Blockchain;
  constructor(blockchain: Blockchain, options: TransactionPoolOptions) {
    super();
    this.blockchain = blockchain;
    this.options = options;
  }
  public executables: Map<string, Heap<Transaction>> = new Map();
  private origins: Map<string, Heap<Transaction>> = new Map();

  public async insert(transaction: Transaction) {
    let err: Error;

    err = this.validateTransaction(transaction);
    if (err != null) {
      // TODO: how do we surface these transaction failures to the caller?!
      throw err;
    }

    const from = Data.from(transaction.from);
    const transactionNonce = Quantity.from(transaction.nonce).toBigInt() || 0n;

    const origin = from.toString();
    const origins = this.origins;
    let queuedOriginTransactions = origins.get(origin);

    let isExecutableTransaction = false;
    const executables = this.executables;
    let executableOriginTransactions = executables.get(origin);

    if (executableOriginTransactions) {
      // check if a transaction with the same nonce is in the origin's
      // executables queue already. Replace the matching transaction or throw this
      // new transaction away as neccessary.
      const pendingArray = executableOriginTransactions.array;
      const priceBump = this.priceBump;
      const newGasPrice = Quantity.from(transaction.gasPrice).toBigInt();
      // Notice: we're iterating over the raw heap array, which isn't
      // neccessarily sorted
      let highestNonce = 0n;
      const length  = executableOriginTransactions.length;
      for (let i = 0; i < length; i++) {
        const currentPendingTx = pendingArray[i];
        const thisNonce = Quantity.from(currentPendingTx.nonce).toBigInt();
        if (thisNonce === transactionNonce) {
          const gasPrice = Quantity.from(currentPendingTx.gasPrice).toBigInt();
          const thisPricePremium = gasPrice + ((gasPrice * priceBump) / 100n);

          // TODO: how do we surface these transaction failures to the caller?!

          // if our new price is `thisPrice * priceBumpPercent` better than our
          // oldPrice, throw out the old now.
          if (newGasPrice > thisPricePremium) {
            isExecutableTransaction = true;
            // do an in-place replace without triggering a resort because we
            // already known where this tranassction should go in this byNonce
            // heap.
            executableOriginTransactions.array[i] = transaction;
            throw new Error("That old transaction sucked, yo!");
          } else {
            throw new Error("That new transaction sucked, yo!");
          }
          break;
        } else if (thisNonce > highestNonce) {
          highestNonce = thisNonce;
        }
      }
      // if our transaction's nonce is 1 higher than the last transaction in the
      // origin's heap we are executable.
      if (transactionNonce === highestNonce + 1n) {
        isExecutableTransaction = true;
      }
    }

    // TODO: since this is the only async code in this `insert` fn, maybe we can
    // put this into the miner? The VM itself does check for everything this
    // validation function checks for.
    const transactor = await this.blockchain.accounts.get(from);
    err = await this.validateTransactor(transaction, transactor);
    if (err != null) {
      // TODO: how do we surface these transaction failures to the caller?!
      throw err;
    }

    if (!isExecutableTransaction) {
      // If the transaction wasn't found in our origin's executables queue,
      // check if it is at the correct `nonce` by looking up the origin's
      // current nonce
      const transactorNextNonce = (transactor.nonce.toBigInt() || 0n) + 1n;
      isExecutableTransaction = transactorNextNonce === transactionNonce;
    }

    // if it is executable add it to the executables queue
    if (isExecutableTransaction) {
      if (executableOriginTransactions) {
        executableOriginTransactions.push(transaction);
      } else {
        // if we don't yet have a executables queue for this origin make one now
        executableOriginTransactions = Heap.from(transaction, byNonce);
        executables.set(origin, executableOriginTransactions);
      }

      this.drainQueued(origin, queuedOriginTransactions, executableOriginTransactions, transactionNonce);
    } else if (queuedOriginTransactions) {
      queuedOriginTransactions.push(transaction);
    } else {
      queuedOriginTransactions = Heap.from(transaction, byNonce);
      origins.set(origin, queuedOriginTransactions);
    }
  }

  private drainQueued(origin: string, queuedOriginTransactions: Heap<Transaction>, executableOriginTransactions: Heap<Transaction>, transactionNonce: bigint) {
    // Now we need to drain any queued transacions that were previously
    // not executable due to nonce gaps into the origin's queue...
    if (queuedOriginTransactions) {
      const origins = this.origins;

      let nextExpectedNonce: bigint = transactionNonce + 1n;
      while (true) {
        const nextTx = queuedOriginTransactions.peek();
        const nextTxNonce = Quantity.from(nextTx.nonce).toBigInt() || 0n;
        if (nextTxNonce !== nextExpectedNonce) {
          break;
        }

        // we've got a an executable nonce! Put it in the executables queue.
        executableOriginTransactions.push(nextTx);

        // And then remove this transaction from its origin's queue
        if (!queuedOriginTransactions.removeBest()) {
          // removeBest() returns `false` when there are no more items after
          // the remove item. Let's do some cleanup when that happens
          origins.delete(origin);
          break;
        }

        nextExpectedNonce += 1n;
      }
    }


    // notify listeners (the miner, probably) that we have executables
    // transactions ready for it
    this.emit("drain", this.executables);
  }

  private validateTransaction(transaction: Transaction): Error {
    // Check the transaction doesn't exceed the current block limit gas.
    if (this.options.gasLimit < Quantity.from(transaction.gasLimit)) {
      return new Error("Transaction gasLimit is too low");
    }

    // Transactions can't be negative. This may never happen using RLP
    // decoded transactions but may occur if you create a transaction using
    // the RPC for example.
    if (transaction.value < 0) {
      return new Error("Transaction value cannot be negative");
    }

    // Should supply enough intrinsic gas
    const gas = transaction.calculateIntrinsicGas();
    if (transaction.gasPrice < gas) {
      return new Error("intrisic gas too low");
    }

    return null;
  }

  private async validateTransactor(transaction: Transaction, transactor: any): Promise<Error> {
    // Transactor should have enough funds to cover the costs
    if (transactor.balance.toBigInt() < transaction.cost()) {
      return new Error("Account does not have enough funds to complete transaction");
    }

    // check that the nonce isn't too low
    let transactorNonce = transactor.nonce.toBigInt();
    if (transactorNonce == null) {
      transactorNonce = -1n;
    }
    const transactionNonce = (Quantity.from(transaction.nonce).toBigInt() || 0n);
    if (transactorNonce >= transactionNonce) {
      return new Error("Transaction nonce is too low");
    }
    return null;
  }
}