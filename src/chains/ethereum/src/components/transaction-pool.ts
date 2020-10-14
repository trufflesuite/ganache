import Account from "../things/account";
import Emittery from "emittery";
import Blockchain from "../blockchain";
import {utils} from "@ganache/utils";
import Transaction from "../things/transaction";
import {Data, Quantity} from "@ganache/utils";
import {GAS_LIMIT, INTRINSIC_GAS_TOO_LOW} from "../things/errors";
import CodedError, { ErrorCodes } from "../things/coded-error";
import { EthereumInternalOptions } from "../options";

function byNonce(values: Transaction[], a: number, b: number) {
  return (Quantity.from(values[b].nonce).toBigInt() || 0n) > (Quantity.from(values[a].nonce).toBigInt() || 0n);
}

export default class TransactionPool extends Emittery.Typed<{}, "drain"> {
  #options: EthereumInternalOptions["miner"];

  /**
   * Minimum price bump percentage to replace an already existing transaction (nonce)
   */
  #priceBump: bigint = 10n;

  #blockchain: Blockchain;
  constructor(options: EthereumInternalOptions["miner"], blockchain: Blockchain) {
    super();
    this.#blockchain = blockchain;
    this.#options = options;
  }
  public readonly executables: Map<string, utils.Heap<Transaction>> = new Map();
  readonly #origins: Map<string, utils.Heap<Transaction>> = new Map();
  readonly #accountPromises = new Map<string, PromiseLike<Account>>();

  /**
   * Inserts a transaction into the pending queue, if executable, or future pool
   * if not.
   * 
   * @param transaction 
   * @param secretKey 
   * @returns `true` if the transaction is executable (pending), `false` if it is queued
   */
  public async insert(transaction: Transaction, secretKey?: Data) {
    let err: Error;

    err = this.validateTransaction(transaction);
    if (err != null) {
      throw err;
    }

    const from = Data.from(transaction.from);
    let transactionNonce: bigint;
    if (secretKey == null || transaction.nonce.length !== 0) {
      transactionNonce = Quantity.from(transaction.nonce).toBigInt() || 0n;
      if (transactionNonce < 0n) {
        throw new Error("Transaction nonce cannot be negative.");
      }
    }

    const origin = from.toString();
    const origins = this.#origins;
    let queuedOriginTransactions = origins.get(origin);

    // Note: we need to lock on this async request to ensure we always process
    // incoming requests in the order they were received! It is possible for
    // the file IO performed by `accounts.get` to vary.
    let transactorPromise = this.#accountPromises.get(origin);
    transactorPromise && await transactorPromise;

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

    let isExecutableTransaction = false;
    const executables = this.executables;
    let executableOriginTransactions = executables.get(origin);

    let length: number;
    if (executableOriginTransactions && (length = executableOriginTransactions.length)) {
      // check if a transaction with the same nonce is in the origin's
      // executables queue already. Replace the matching transaction or throw this
      // new transaction away as neccessary.
      const pendingArray = executableOriginTransactions.array;
      const priceBump = this.#priceBump;
      const newGasPrice = Quantity.from(transaction.gasPrice).toBigInt();
      // Notice: we're iterating over the raw heap array, which isn't
      // necessarily sorted
      for (let i = 0; i < length; i++) {
        const currentPendingTx = pendingArray[i];
        const thisNonce = Quantity.from(currentPendingTx.nonce).toBigInt();
        if (thisNonce === transactionNonce) {
          const gasPrice = Quantity.from(currentPendingTx.gasPrice).toBigInt();
          const thisPricePremium = gasPrice + (gasPrice * priceBump) / 100n;

          // if our new price is `gasPrice * priceBumpPercent` better than our
          // oldPrice, throw out the old now.
          if (!currentPendingTx.locked && newGasPrice > thisPricePremium) {
            isExecutableTransaction = true;
            // do an in-place replace without triggering a re-sort because we
            // already know where this tranasaction should go in this "byNonce"
            // heap.
            pendingArray[i] = transaction;

            currentPendingTx.finalize("rejected", new CodedError(
              "Transaction replaced by better transaction", ErrorCodes.TRANSACTION_REJECTED
            ));
          } else {
            throw new CodedError("transaction rejected; gas price too low to replace existing transaction", ErrorCodes.TRANSACTION_REJECTED);
          }
        }
        if (thisNonce > highestNonce) {
          highestNonce = thisNonce;
        }
      }
      if (secretKey && transactionNonce === void 0) {
        // if we aren't signed and don't have a transactionNonce yet set it now
        transactionNonce = highestNonce + 1n;
        transaction.nonce = Quantity.from(transactionNonce).toBuffer();
        isExecutableTransaction = true;
        highestNonce = transactionNonce;
      } else if (transactionNonce === highestNonce + 1n) {
        // if our transaction's nonce is 1 higher than the last transaction in the
        // origin's heap we are executable.
        isExecutableTransaction = true;
        highestNonce = transactionNonce;
      }
    } else {
      if (!transactorPromise) {
        transactorPromise = this.#blockchain.accounts.get(from)
        this.#accountPromises.set(origin, transactorPromise);
        transactorPromise.then(() => {
          this.#accountPromises.delete(origin);
        });
      }
      const transactor = await transactorPromise;
      
      const transactorNonce = transactor.nonce.toBigInt() || 0n;
      if (secretKey && transactionNonce === void 0) {
        // if we don't have a transactionNonce, just use the account's next
        // nonce and mark as executable
        transactionNonce = transactorNonce ? transactorNonce : 0n;
        highestNonce = transactionNonce;
        isExecutableTransaction = true;
        transaction.nonce = Quantity.from(transactionNonce).toBuffer();
      } else if (transactionNonce < transactorNonce) {
        // it's an error if the transaction's nonce is <= the persisted nonce
        throw new Error(`the tx doesn't have the correct nonce. account has nonce of: ${transactorNonce} tx has nonce of: ${transactionNonce}`);
      } else if (transactionNonce === transactorNonce) {
        isExecutableTransaction = true;
      }
    }

    // this.#assertValidTransactorBalance(transaction, transactor);

    // now that we know we have a transaction nonce we can sign the transaction
    // (if we have the secret key)
    if (secretKey) {
      transaction.sign(secretKey.toBuffer());
    }

    if (isExecutableTransaction) {
      // if it is executable add it to the executables queue
      if (executableOriginTransactions) {
        executableOriginTransactions.push(transaction);
      } else {
        // if we don't yet have a executables queue for this origin make one now
        executableOriginTransactions = utils.Heap.from(transaction, byNonce);
        executables.set(origin, executableOriginTransactions);
      }

      this.#drainQueued(origin, queuedOriginTransactions, executableOriginTransactions, transactionNonce);
      return true;
    } else {
      // otherwise, put it in the future queue
      if (queuedOriginTransactions) {
        queuedOriginTransactions.push(transaction);
      } else {
        queuedOriginTransactions = utils.Heap.from(transaction, byNonce);
        origins.set(origin, queuedOriginTransactions);
      }
      return false;
    }
  }

  /**
   * Returns the transaction matching the given hash
   * @param transactionHash 
   */
  public find(transactionHash: Buffer) {
    for (let [_, transactions] of this.executables) {
      for (let tx of transactions.array) {
        if (tx.hash().equals(transactionHash)) {
          return tx;
        }
      }
    }

    for (let [_, transactions] of this.#origins) {
      if (transactions === undefined) continue;
      for (let tx of transactions.array) {
        if (tx.hash().equals(transactionHash)) {
          return tx;
        }
      }
    }
    return null;
  }

  #drainQueued = (
    origin: string,
    queuedOriginTransactions: utils.Heap<Transaction>,
    executableOriginTransactions: utils.Heap<Transaction>,
    transactionNonce: bigint
  ) => {
    // Now we need to drain any queued transacions that were previously
    // not executable due to nonce gaps into the origin's queue...
    if (queuedOriginTransactions) {
      const origins = this.#origins;

      let nextExpectedNonce = transactionNonce + 1n;
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
          // the removed item. Let's do some cleanup when that happens.
          origins.delete(origin);
          break;
        }

        nextExpectedNonce += 1n;
      }
    }

    // notify listeners (the blockchain, then the miner, eventually) that we 
    // have executable transactions ready
    this.emit("drain");
  };

  validateTransaction = (transaction: Transaction): Error => {
    // Check the transaction doesn't exceed the current block limit gas.
    if (Quantity.from(transaction.gasLimit) > this.#options.blockGasLimit) {
      return new CodedError(GAS_LIMIT, ErrorCodes.INVALID_INPUT);
    }

    // Should supply enough intrinsic gas
    const gas = transaction.calculateIntrinsicGas();
    if (Quantity.from(transaction.gasLimit).toBigInt() < gas) {
      return new CodedError(INTRINSIC_GAS_TOO_LOW, ErrorCodes.INVALID_INPUT);
    }

    return null;
  };

  // /**
  //  * Returns the *live* executables map once all transactions that have started
  //  * insertion into the pool have been fully processed.
  //  * 
  //  * This is neccessary as a transaction added via `eth_sendTransaction` 
  //  * immediately followed by an `evm_mine` may not yet be in the executables
  //  * pool when `evm_mine` triggers the mine operation.
  //  */
  // getFutureExecutablesMap(){
  //   // When transactions are pushed into the transactionPool they aren't always
  //   // instantly added to the executables pool, due to potential file IO, so we
  //   // must wait for any pending file IO to finish before we can get
  //   return Promise.all([...this.#accountPromises.values()]).then(() => this.#executables);
  // }

  // getCurrentExecutablesMap() {
  //   return this.#executables;
  // }

  #assertValidTransactorBalance = (transaction: Transaction, transactor: any): Error | null => {
    // Transactor should have enough funds to cover the costs
    if (transactor.balance.toBigInt() < transaction.cost()) {
      return new Error("Account does not have enough funds to complete transaction");
    }
    return null;
  }
}
