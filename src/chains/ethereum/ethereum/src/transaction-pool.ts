import Emittery from "emittery";
import Blockchain from "./blockchain";
import { Heap } from "@ganache/utils";
import { Data, Quantity, JsonRpcErrorCode } from "@ganache/utils";
import {
  GAS_LIMIT,
  INTRINSIC_GAS_TOO_LOW,
  CodedError,
  UNDERPRICED,
  REPLACED,
  TRANSACTION_LOCKED,
  INSUFFICIENT_FUNDS
} from "@ganache/ethereum-utils";
import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { Executables } from "./miner/executables";
import { TypedTransaction } from "@ganache/ethereum-transaction";
import cloneDeep from "lodash.clonedeep";

/**
 * Checks if the `replacer` is eligible to replace the `replacee` transaction
 * in the transaction pool queue. Replacement eligibility requires that
 * the transactions have the same nonce and the `replacer` has a gas price
 * that is `gasPrice * priceBump` better than our `replacee`.
 * @param replacee -
 * @param replaceeNonce -
 * @param replacerNonce -
 * @param replacerGasPrice -
 * @param priceBump -
 */
function shouldReplace(
  replacee: TypedTransaction,
  replacerNonce: bigint,
  replacer: TypedTransaction,
  priceBump: bigint
): boolean {
  const replaceeNonce = replacee.nonce.toBigInt();
  // if the nonces differ, our replacer is not eligible to replace
  if (replaceeNonce !== replacerNonce) {
    return false;
  }

  // if the transaction being replaced is in the middle of being mined, we can't
  // replpace it so let's back out early
  if (replacee.locked) {
    throw new CodedError(
      TRANSACTION_LOCKED,
      JsonRpcErrorCode.TRANSACTION_REJECTED
    );
  }

  const replacerTip =
    "maxPriorityFeePerGas" in replacer
      ? replacer.maxPriorityFeePerGas.toBigInt()
      : replacer.effectiveGasPrice.toBigInt();
  const replacerMaxFee =
    "maxFeePerGas" in replacer
      ? replacer.maxFeePerGas.toBigInt()
      : replacer.effectiveGasPrice.toBigInt();
  const replaceeTip =
    "maxPriorityFeePerGas" in replacee
      ? replacee.maxPriorityFeePerGas.toBigInt()
      : replacee.effectiveGasPrice.toBigInt();
  const replaceeMaxFee =
    "maxFeePerGas" in replacee
      ? replacee.maxFeePerGas.toBigInt()
      : replacee.effectiveGasPrice.toBigInt();

  const tipPremium = replaceeTip + (replaceeTip * priceBump) / 100n;
  const maxFeePremium = replaceeMaxFee + (replaceeMaxFee * priceBump) / 100n;

  // if both the tip and max fee of the new transaction aren't
  // `priceBumpPercent` more than the existing transaction, this transaction is
  // underpriced
  if (replacerTip < tipPremium || replacerMaxFee < maxFeePremium) {
    throw new CodedError(UNDERPRICED, JsonRpcErrorCode.TRANSACTION_REJECTED);
  } else {
    return true;
  }
}

function byNonce(values: TypedTransaction[], a: number, b: number) {
  return (
    (values[b].nonce.toBigInt() || 0n) > (values[a].nonce.toBigInt() || 0n)
  );
}
/**
 * Used to track a transaction's placement in the transaction pool based off
 * of the its nonce.
 */
export enum TriageOption {
  /**
   * Default value. A tx will be added to the future queue if it is not yet
   * executable based off of the transaction's nonce.
   */
  FutureQueue = 0,
  /**
   * The transaction is currently executable based off the transaction's nonce.
   */
  Executable = 1,
  /**
   * The transaction is currently executable, has the same nonce as a pending
   * transaction of the same origin, and has a gas price that is high enough to
   * replace the currently pending transaction.
   */
  ReplacesPendingExecutable = 2,
  /**
   * The transaction is not currently executable but has the same nonce as a
   * future queued transaction of the same origin and has a gas price that is
   * high enough to replace the future queued transaction.
   */
  ReplacesFutureTransaction = 3
}
export default class TransactionPool extends Emittery<{ drain: undefined }> {
  #options: EthereumInternalOptions["miner"];

  /**
   * Minimum price bump percentage needed to replace a transaction that already exists in the transaction pool.
   */
  #priceBump: bigint;

  #blockchain: Blockchain;
  constructor(
    options: EthereumInternalOptions["miner"],
    blockchain: Blockchain,
    origins: Map<string, Heap<TypedTransaction>> = new Map()
  ) {
    super();
    this.#blockchain = blockchain;
    this.#options = options;
    this.origins = origins;
    this.#priceBump = options.priceBump;
  }
  public readonly executables: Executables = {
    inProgress: new Set(),
    pending: new Map()
  };
  public readonly origins: Map<string, Heap<TypedTransaction>>;
  readonly #accountPromises = new Map<
    string,
    Promise<{ balance: Quantity; nonce: Quantity }>
  >();

  /**
   * Inserts a transaction into the pending queue, if executable, or future pool
   * if not.
   *
   * @param transaction -
   * @param secretKey -
   * @returns data that can be used to drain the queue
   */
  public async prepareTransaction(
    transaction: TypedTransaction,
    secretKey?: Data
  ) {
    let err: Error;

    err = this.#validateTransaction(transaction);
    if (err != null) {
      throw err;
    }

    const from = transaction.from;
    let txNonce: bigint;
    if (!transaction.nonce.isNull()) {
      txNonce = transaction.nonce.toBigInt();
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
    let transactorPromise = this.#accountPromises.get(origin);
    if (transactorPromise) {
      await transactorPromise;
    }
    // if the user called sendTransaction or sendRawTransaction, effectiveGasPrice
    // hasn't been set yet on the tx. calculating the effectiveGasPrice requires
    // the block context, so we need to set it outside of the transaction. this
    // value is updated in the miner as we're more sure of what block the tx will
    // actually go on, but we still need to set it here to check for valid
    // transaction replacements of same origin/nonce transactions
    if (
      !transaction.effectiveGasPrice &&
      this.#blockchain.common.isActivatedEIP(1559)
    ) {
      const baseFeePerGas = this.#blockchain.blocks.latest.header.baseFeePerGas;
      transaction.updateEffectiveGasPrice(baseFeePerGas);
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

    if (!transactorPromise) {
      transactorPromise = this.#blockchain.accounts.getNonceAndBalance(from);
      this.#accountPromises.set(origin, transactorPromise);
      transactorPromise.then(() => {
        this.#accountPromises.delete(origin);
      });
    }
    const transactor = await transactorPromise;

    const cost =
      transaction.gas.toBigInt() * transaction.maxGasPrice().toBigInt() +
      transaction.value.toBigInt();
    if (transactor.balance.toBigInt() < cost) {
      throw new CodedError(
        INSUFFICIENT_FUNDS,
        JsonRpcErrorCode.TRANSACTION_REJECTED
      );
    }

    const origins = this.origins;
    const queuedOriginTransactions = origins.get(origin);

    let transactionPlacement = TriageOption.FutureQueue;
    const executables = this.executables.pending;
    let executableOriginTransactions = executables.get(origin);

    const priceBump = this.#priceBump;
    let length: number;
    if (
      executableOriginTransactions &&
      (length = executableOriginTransactions.length)
    ) {
      // check if a transaction with the same nonce is in the origin's
      // executables queue already. Replace the matching transaction or throw this
      // new transaction away as necessary.
      const pendingArray = executableOriginTransactions.array;
      // Notice: we're iterating over the raw heap array, which isn't
      // necessarily sorted
      for (let i = 0; i < length; i++) {
        const pendingTx = pendingArray[i];
        if (shouldReplace(pendingTx, txNonce, transaction, priceBump)) {
          // do an in-place replace without triggering a re-sort because we
          // already know where this transaction should go in this "byNonce"
          // heap.
          pendingArray[i] = transaction;
          // we don't want to mark this transaction as "executable" and thus
          // have it added to the pool again. so use this flag to skip
          // a re-queue.
          transactionPlacement = TriageOption.ReplacesPendingExecutable;
          pendingTx.finalize(
            "rejected",
            new CodedError(REPLACED, JsonRpcErrorCode.TRANSACTION_REJECTED)
          );
          break;
        }
        // track the highest nonce for all transactions pending from this
        // origin. If this transaction can't be used as a replacement, it will
        // use this next highest nonce.
        const pendingTxNonce = pendingTx.nonce.toBigInt();
        if (pendingTxNonce > highestNonce) highestNonce = pendingTxNonce;
      }

      if (txNonce === void 0) {
        // if we aren't signed and don't have a transactionNonce yet set it now
        txNonce = highestNonce + 1n;
        transaction.nonce = Quantity.from(txNonce);
        transactionPlacement = TriageOption.Executable;
      } else if (txNonce === highestNonce + 1n) {
        // if our transaction's nonce is 1 higher than the last transaction in the
        // origin's heap we are executable.
        transactionPlacement = TriageOption.Executable;
      }
    } else {
      // since we don't have any executable transactions at the moment, we need
      // to find our nonce from the account itself...
      const transactorNonce = transactor.nonce.toBigInt();
      if (txNonce === void 0) {
        // if we don't have a transactionNonce, just use the account's next
        // nonce and mark as executable
        txNonce = transactorNonce ? transactorNonce : 0n;
        transaction.nonce = Quantity.from(txNonce);
        transactionPlacement = TriageOption.Executable;
      } else if (txNonce < transactorNonce) {
        // it's an error if the transaction's nonce is <= the persisted nonce
        throw new CodedError(
          `the tx doesn't have the correct nonce. account has nonce of: ${transactorNonce} tx has nonce of: ${txNonce}`,
          JsonRpcErrorCode.INVALID_INPUT
        );
      } else if (txNonce === transactorNonce) {
        transactionPlacement = TriageOption.Executable;
      }
    }

    // we have future transactions for this origin, this transaction is not yet
    // executable, and this transaction is not replacing a previously queued/
    // executable transaction, then this is potentially eligible to replace a
    // future transaction
    if (
      queuedOriginTransactions &&
      transactionPlacement !== TriageOption.Executable &&
      transactionPlacement !== TriageOption.ReplacesPendingExecutable &&
      (length = queuedOriginTransactions.length)
    ) {
      // check if a transaction with the same nonce is in the origin's
      // future queue already. Replace the matching transaction or throw this
      // new transaction away as necessary.

      const queuedArray = queuedOriginTransactions.array;
      // Notice: we're iterating over the raw heap array, which isn't
      // necessarily sorted
      for (let i = 0; i < length; i++) {
        const queuedTx = queuedArray[i];
        if (shouldReplace(queuedTx, txNonce, transaction, priceBump)) {
          // do an in-place replace without triggering a re-sort because we
          // already know where this transaction should go in this "byNonce"
          // heap.
          queuedArray[i] = transaction;
          // we don't want to mark this transaction as "FutureQueue" and thus
          // have it added to the pool again. so use this flag to skip
          // a re-queue.
          transactionPlacement = TriageOption.ReplacesFutureTransaction;
          queuedTx.finalize(
            "rejected",
            new CodedError(REPLACED, JsonRpcErrorCode.TRANSACTION_REJECTED)
          );
          break;
        }
      }
    }

    // now that we know we have a transaction nonce we can sign the transaction
    // (if we have the secret key)
    if (secretKey) {
      transaction.signAndHash(secretKey.toBuffer());
    }

    switch (transactionPlacement) {
      case TriageOption.Executable:
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
          let nextExpectedNonce = txNonce + 1n;
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

      case TriageOption.FutureQueue:
        // otherwise, put it in the future queue
        if (queuedOriginTransactions) {
          queuedOriginTransactions.push(transaction);
        } else {
          origins.set(origin, Heap.from(transaction, byNonce));
        }
        return false;

      case TriageOption.ReplacesPendingExecutable:
        // we've replaced the best transaction from this origin for this nonce,
        // and it is executable
        return true;

      case TriageOption.ReplacesFutureTransaction:
        // we've replaced the best transaction from this origin for a future
        // nonce, so this one isn't executable
        return false;
    }
  }

  public clear() {
    this.origins.clear();
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
   * @param transactionHash -
   */
  public find(transactionHash: Buffer) {
    const { pending, inProgress } = this.executables;

    // first search pending transactions
    for (let [_, transactions] of this.origins) {
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
  /**
   * Deep clones and resets the transaction pool's `executables` such that `inProgress`
   * transactions are moved back to `pending` and all transactions are unlocked.
   * @returns Cloned and reset copy of transaction pool's `executables`.
   */
  public cloneAndResetExecutables() {
    const executables = cloneDeep(this.executables);
    const inProgress = executables.inProgress;
    const pending = executables.pending;
    if (inProgress.size > 0) {
      inProgress.forEach(tx => {
        tx.locked = false; // unlock the tx so it can actually be mined and "added" to the block
        const origin = tx.from.toString();
        if (pending.has(origin)) {
          const currentAtOrigin = pending.get(origin);
          currentAtOrigin.push(tx);
          pending.set(origin, currentAtOrigin);
        } else {
          const newHeap = utils.Heap.from(tx, byNonce);
          pending.set(origin, newHeap);
        }
        inProgress.delete(tx);
      });
    }
    return executables;
  }

  readonly drain = () => {
    // notify listeners (the blockchain, then the miner, eventually) that we
    // have executable transactions ready
    this.emit("drain");
  };

  readonly #validateTransaction = (transaction: TypedTransaction): Error => {
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
