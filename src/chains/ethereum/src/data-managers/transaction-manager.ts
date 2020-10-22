import Transaction from "../things/transaction";
import Manager from "./manager";
import TransactionPool from "../transaction-pool";
import { EthereumInternalOptions } from "../options";
import { LevelUp } from "levelup";
import Blockchain from "../blockchain";
import { Data, utils } from "@ganache/utils";
import Common from "ethereumjs-common";

export default class TransactionManager extends Manager<Transaction> {
  public transactionPool: TransactionPool;

  #queue = new utils.PromiseQueue();
  #paused = false;
  #resumer: Promise<void>;
  #resolver: (value: void ) => void;

  constructor(options: EthereumInternalOptions["miner"], common: Common, blockchain: Blockchain, base: LevelUp) {
    super(base, Transaction, common);

    this.transactionPool = new TransactionPool(options, blockchain);
  }

  /**
   * Adds the transaction to the transaction pool.
   * 
   * Returns a promise that is only resolved in the order it was added.
   * 
   * @param transaction 
   * @param secretKey 
   * @returns `true` if the `transaction` is immediately executable, `false` if
   * it may be valid in the future. Throws if the transaction is invalid.
   */
  public async add(transaction: Transaction, secretKey?: Data) {
    if (this.#paused) {
      await this.#resumer;
    }
    // Because ganache requires determinism, we can't allow varying IO times to
    // potentially affect the order in which transactions are inserted into the
    // pool, so we use a FIFO queue to _return_ transaction insertions in the
    // order the were received.
    const insertion = this.transactionPool.prepareTransaction(transaction, secretKey);
    const result = await this.#queue.add(insertion);
    if (result) {
      this.transactionPool.drainQueued(result);
      return true;
    } else {
      return false;
    }
  }

  /**
   * Immediately ignores all transactions that were in the process of being
   * added to the pool. These transactions' `push` promises will be resolved
   * immediately with the value `false` and will _not_ be added to the pool.
   * 
   * Also clears all transactions that were already added to the pool.
   * 
   * Transactions that are currently in the process of being mined may still be
   * mined.
   */
  public clear() {
    this.#queue.clear();
    this.transactionPool.clear();
  }

  /**
   * Stop processing _new_ transactions; puts new requests in a queue. Has no
   * affect if already paused.
   */
  public pause() {
    if (!this.#paused) return;

    this.#paused = true;
    this.#resumer = new Promise(resolve => {
      this.#resolver = resolve;
    });
  }

  /**
   * Resume processing transactions. Has no effect if not paused.
   */
  public resume = () => {
    if (!this.#paused) return;
    
    this.#paused = false;
    this.#resolver();
  }
}
