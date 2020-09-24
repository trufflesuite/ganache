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
  public priceBump: bigint = 10n;

  #blockchain: Blockchain;
  constructor(options: EthereumInternalOptions["miner"], blockchain: Blockchain) {
    super();
    this.#blockchain = blockchain;
    this.#options = options;
  }
  public executables: Map<string, {
    nonce: bigint,
    transactions: utils.Heap<Transaction>
  }> = new Map();
  #origins: Map<string, utils.Heap<Transaction>> = new Map();
  #accountPromises = new Map<string, PromiseLike<Account>>();

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

    let highestNonce = 0n;

    let isExecutableTransaction = false;
    const executables = this.executables;
    let executableOrigin = executables.get(origin);
    let executableOriginTransactions: utils.Heap<Transaction>;
    if (executableOrigin) {
      highestNonce = executableOrigin.nonce;
      executableOriginTransactions = executableOrigin.transactions;
    }

    let length: number;
    if (executableOriginTransactions && (length = executableOriginTransactions.length)) {
      // check if a transaction with the same nonce is in the origin's
      // executables queue already. Replace the matching transaction or throw this
      // new transaction away as neccessary.
      const pendingArray = executableOriginTransactions.array;
      const priceBump = this.priceBump;
      const newGasPrice = Quantity.from(transaction.gasPrice).toBigInt();
      // Notice: we're iterating over the raw heap array, which isn't
      // neccessarily sorted
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
            // do an in-place replace without triggering a resort because we
            // already known where this tranassction should go in this byNonce
            // heap.
            pendingArray[i] = transaction;

            // TODO: how to surface this to the caller?!?
            console.error("The *old* transation was rejected");
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

    // if it is executable add it to the executables queue
    if (isExecutableTransaction) {
      if (executableOriginTransactions) {
        executableOrigin.nonce = highestNonce;
        executableOriginTransactions.push(transaction);
      } else {
        // if we don't yet have a executables queue for this origin make one now
        executableOriginTransactions = utils.Heap.from(transaction, byNonce);
        executables.set(origin, {nonce: highestNonce, transactions: executableOriginTransactions});
      }

      this.#drainQueued(origin, queuedOriginTransactions, executableOriginTransactions, transactionNonce);
      return true;
    } else {
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
