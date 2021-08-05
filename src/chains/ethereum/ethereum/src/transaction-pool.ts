import Emittery from "emittery";
import Blockchain from "./blockchain";
import { Heap } from "@ganache/utils";
import { Data, Quantity, JsonRpcErrorCode, ACCOUNT_ZERO } from "@ganache/utils";
import {
  GAS_LIMIT,
  INTRINSIC_GAS_TOO_LOW,
  NONCE_TOO_LOW,
  CodedError
} from "@ganache/ethereum-utils";
import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { RuntimeTransaction } from "@ganache/ethereum-transaction";
import { Executables } from "./miner/executables";

function byNonce(values: RuntimeTransaction[], a: number, b: number) {
  return (
    (values[b].nonce.toBigInt() || 0n) > (values[a].nonce.toBigInt() || 0n)
  );
}

export default class TransactionPool extends Emittery.Typed<{}, "drain"> {
  #options: EthereumInternalOptions["miner"];

  /**
   * Minimum price bump percentage to replace an already existing transaction (nonce)
   */
  #priceBump: bigint = 10n;

  #blockchain: Blockchain;
  constructor(
    options: EthereumInternalOptions["miner"],
    blockchain: Blockchain
  ) {
    super();
    this.#blockchain = blockchain;
    this.#options = options;
  }
  public readonly executables: Executables = {
    inProgress: new Set(),
    pending: new Map()
  };
  readonly #origins: Map<string, Heap<RuntimeTransaction>> = new Map();
  readonly #accountPromises = new Map<string, Promise<Quantity>>();

  /**
   * Inserts a transaction into the pending queue, if executable, or future pool
   * if not.
   *
   * @param transaction
   * @param secretKey
   * @returns data that can be used to drain the queue
   */
  public async prepareTransaction(
    transaction: RuntimeTransaction,
    secretKey?: Data
  ) {
    let err: Error;

    err = this.#validateTransaction(transaction);
    if (err != null) {
      throw err;
    }

    const from = transaction.from;
    let transactionNonce: bigint;
    if (!transaction.nonce.isNull()) {
      transactionNonce = transaction.nonce.toBigInt();
      if (transactionNonce < 0n) {
        throw new CodedError(NONCE_TOO_LOW, JsonRpcErrorCode.INVALID_INPUT);
      }
    }

    const origin = from.toString();

    // We await the `transactorNoncePromise` async request to ensure we process
    // transactions in FIFO order *by account*. We look up accounts because
    // ganache fills in missing nonces automatically, and we need to do it in
    // order.
    // The trick here is that we might actually get the next nonce from the
    // account's pending executable transactions, not the account...
    // But another transaction might currently be getting the nonce from the
    // account, if it is, we need to wait for it to be done doing that. Hence:
    let transactorNoncePromise = this.#accountPromises.get(origin);
    if (transactorNoncePromise) {
      await transactorNoncePromise;
    }

    // we should _probably_ cache `highestNonce`, but it's actually a really hard thing to cache as the current highest
    // nonce might be invalidated (like if the sender doesn't have enough funds), so we'd have to go back to the previous
    // highest nonce... but what if that previous highest nonce was also invalidated?! we have to go back to the... you
    // get the picture.
    // So... we currently do things sub-optimally:
    // if we currently have txs in `executableOriginTransactions`, we iterate over them to find the highest nonce
    // and use that. Otherwise, we just fetch it from the database.
    // Beware! There might still be race conditions here:
    //  * if the highest tx executes, which causes it to be removed from the `executableOriginTransactions` heap,
    // then a new tx comes in _before_ the block is persisted to the database, the nonce might be of the second
    // tx would be too low.
    //  * rough idea for a fix: transactions have a `finalize` method that is called _after_ the tx is saved. Maybe
    // when tx's are executed their nonce is moved to a `highNonceByOrigin` map? We'd check this map in addition to the
    // `executableOriginTransactions` map, always taking the highest of the two.
    let highestNonce = 0n;

    const origins = this.#origins;
    const queuedOriginTransactions = origins.get(origin);

    let isExecutableTransaction = false;
    const executables = this.executables.pending;
    let executableOriginTransactions = executables.get(origin);

    let length: number;
    if (
      executableOriginTransactions &&
      (length = executableOriginTransactions.length)
    ) {
      // check if a transaction with the same nonce is in the origin's
      // executables queue already. Replace the matching transaction or throw this
      // new transaction away as necessary.
      const pendingArray = executableOriginTransactions.array;
      const priceBump = this.#priceBump;
      const newGasPrice = transaction.gasPrice.toBigInt();
      // Notice: we're iterating over the raw heap array, which isn't
      // necessarily sorted
      for (let i = 0; i < length; i++) {
        const currentPendingTx = pendingArray[i];
        const thisNonce = currentPendingTx.nonce.toBigInt();
        if (thisNonce === transactionNonce) {
          const gasPrice = currentPendingTx.gasPrice.toBigInt();
          const thisPricePremium = gasPrice + (gasPrice * priceBump) / 100n;

          // if our new price is `gasPrice * priceBumpPercent` better than our
          // oldPrice, throw out the old now.
          if (!currentPendingTx.locked && newGasPrice > thisPricePremium) {
            isExecutableTransaction = true;
            // do an in-place replace without triggering a re-sort because we
            // already know where this transaction should go in this "byNonce"
            // heap.
            pendingArray[i] = transaction;

            currentPendingTx.finalize(
              "rejected",
              new CodedError(
                "Transaction replaced by better transaction",
                JsonRpcErrorCode.TRANSACTION_REJECTED
              )
            );
          } else {
            throw new CodedError(
              "replacement transaction underpriced",
              JsonRpcErrorCode.TRANSACTION_REJECTED
            );
          }
        }
        if (thisNonce > highestNonce) {
          highestNonce = thisNonce;
        }
      }
      if (transactionNonce === void 0) {
        // if we aren't signed and don't have a transactionNonce yet set it now
        transactionNonce = highestNonce + 1n;
        transaction.nonce = Quantity.from(transactionNonce);
        isExecutableTransaction = true;
        highestNonce = transactionNonce;
      } else if (transactionNonce === highestNonce + 1n) {
        // if our transaction's nonce is 1 higher than the last transaction in the
        // origin's heap we are executable.
        isExecutableTransaction = true;
        highestNonce = transactionNonce;
      }
    } else {
      // since we don't have any executable transactions at the moment, we need
      // to find our nonce from the account itself...
      if (!transactorNoncePromise) {
        transactorNoncePromise = this.#blockchain.accounts.getNonce(from);
        this.#accountPromises.set(origin, transactorNoncePromise);
        transactorNoncePromise.then(() => {
          this.#accountPromises.delete(origin);
        });
      }
      const transactor = await transactorNoncePromise;

      const transactorNonce = transactor ? transactor.toBigInt() : 0n;
      if (transactionNonce === void 0) {
        // if we don't have a transactionNonce, just use the account's next
        // nonce and mark as executable
        transactionNonce = transactorNonce ? transactorNonce : 0n;
        highestNonce = transactionNonce;
        isExecutableTransaction = true;
        transaction.nonce = Quantity.from(transactionNonce);
      } else if (transactionNonce < transactorNonce) {
        // it's an error if the transaction's nonce is <= the persisted nonce
        throw new Error(
          `the tx doesn't have the correct nonce. account has nonce of: ${transactorNonce} tx has nonce of: ${transactionNonce}`
        );
      } else if (transactionNonce === transactorNonce) {
        isExecutableTransaction = true;
      }
    }

    // now that we know we have a transaction nonce we can sign the transaction
    // (if we have the secret key)
    if (secretKey) {
      transaction.signAndHash(secretKey.toBuffer());
    } else if (transaction.v == null) {
      // if we don't have the secret key and we aren't already signed,
      // then we are a "fake transaction", so we sign it with a fake key.
      const from = transaction.from.toBuffer();

      let fakePrivateKey: Buffer;
      if (from.equals(ACCOUNT_ZERO)) {
        fakePrivateKey = Buffer.allocUnsafe(32);
        // allow signing with the 0x0 address
        // see: https://github.com/ethereumjs/ethereumjs-monorepo/issues/829#issue-674385636
        fakePrivateKey[0] = 1;
      } else {
        fakePrivateKey = Buffer.concat([from, from.slice(0, 12)]);
      }
      transaction.signAndHash(fakePrivateKey);
    }

    if (isExecutableTransaction) {
      // if it is executable add it to the executables queue
      if (executableOriginTransactions) {
        executableOriginTransactions.push(transaction);
      } else {
        // if we don't yet have an executables queue for this origin make one now
        executableOriginTransactions = Heap.from(transaction, byNonce);
        executables.set(origin, executableOriginTransactions);
      }

      // Now we need to drain any queued transactions that were previously
      // not executable due to nonce gaps into the origin's queue...
      if (queuedOriginTransactions) {
        let nextExpectedNonce = transactionNonce + 1n;
        while (true) {
          const nextTx = queuedOriginTransactions.peek();
          const nextTxNonce = nextTx.nonce.toBigInt() || 0n;
          if (nextTxNonce !== nextExpectedNonce) {
            break;
          }

          // we've got a an executable nonce! Put it in the executables queue.
          executableOriginTransactions.push(nextTx);

          // And then remove this transaction from its origin's queue
          if (!queuedOriginTransactions.removeBest()) {
            // removeBest() returns `false` when there are no more items after
            // the removed item. Let's do some cleanup when that happens.
            origins.delete(origin);
            break;
          }

          nextExpectedNonce += 1n;
        }
      }

      return true;
    } else {
      // otherwise, put it in the future queue
      if (queuedOriginTransactions) {
        queuedOriginTransactions.push(transaction);
      } else {
        origins.set(origin, Heap.from(transaction, byNonce));
      }

      return false;
    }
  }

  public clear() {
    this.#origins.clear();
    this.#accountPromises.clear();
    this.executables.pending.clear();
  }

  /**
   * Returns the transaction matching the given hash.
   *
   * This isn't the fastest thing... but querying for pending transactions is
   * likely rare, so leaving this slow so other code paths can be faster might
   * be okay.
   *
   * @param transactionHash
   */
  public find(transactionHash: Buffer) {
    const { pending, inProgress } = this.executables;

    // first search pending transactions
    for (let [_, transactions] of this.#origins) {
      if (transactions === undefined) continue;
      const arr = transactions.array;
      for (let i = 0; i < transactions.length; i++) {
        const tx = arr[i];
        if (tx.hash.toBuffer().equals(transactionHash)) {
          return tx;
        }
      }
    }

    // then transactions eligible for execution
    for (let [_, transactions] of pending) {
      const arr = transactions.array;
      for (let i = 0; i < transactions.length; i++) {
        const tx = arr[i];
        if (tx.hash.toBuffer().equals(transactionHash)) {
          return tx;
        }
      }
    }

    // and finally transactions that have just been processed, but not yet saved
    for (let tx of inProgress) {
      if (tx.hash.toBuffer().equals(transactionHash)) {
        return tx;
      }
    }
    return null;
  }

  readonly drain = () => {
    // notify listeners (the blockchain, then the miner, eventually) that we
    // have executable transactions ready
    this.emit("drain");
  };

  readonly #validateTransaction = (transaction: RuntimeTransaction): Error => {
    // Check the transaction doesn't exceed the current block limit gas.
    if (transaction.gas > this.#options.blockGasLimit) {
      return new CodedError(GAS_LIMIT, JsonRpcErrorCode.INVALID_INPUT);
    }

    // Should supply enough intrinsic gas
    const gas = transaction.calculateIntrinsicGas();
    if (gas === -1n || transaction.gas.toBigInt() < gas) {
      return new CodedError(
        INTRINSIC_GAS_TOO_LOW,
        JsonRpcErrorCode.INVALID_INPUT
      );
    }

    return null;
  };
}
