import Manager from "./manager";
import TransactionPool from "../transaction-pool";
import { EthereumInternalOptions } from "@ganache/ethereum-options";
import Blockchain from "../blockchain";
import PromiseQueue from "@ganache/promise-queue";
import type { Common } from "@ethereumjs/common";
import { Data, Quantity } from "@ganache/utils";
import {
  TransactionFactory,
  Transaction,
  TypedTransaction,
  serializeRpcForDb
} from "@ganache/ethereum-transaction";
import { GanacheLevelUp } from "../database";

// since our Manager needs to receive and Instantiable class with a
// consistent return type and our transaction factory can return
// any number of transaction types, we pass in this empty
// no op class to fool the Manager

class NoOp {}
export default class TransactionManager extends Manager<NoOp> {
  public readonly transactionPool: TransactionPool;

  readonly #queue = new PromiseQueue<boolean>();
  #paused = false;
  #resumer: Promise<void>;
  #resolver: (value: void) => void;

  #blockchain: Blockchain;

  constructor(
    options: EthereumInternalOptions,
    common: Common,
    blockchain: Blockchain,
    base: GanacheLevelUp
  ) {
    super(base, TransactionFactory, common);
    this.#blockchain = blockchain;

    this.transactionPool = new TransactionPool(options, blockchain);
  }

  fromFallback = async (transactionHash: Buffer) => {
    const { fallback } = this.#blockchain;
    const tx = await fallback.request<Transaction>("eth_getTransactionByHash", [
      Data.toString(transactionHash)
    ]);
    if (tx == null) return null;

    const blockHash = Data.from((tx as any).blockHash, 32);
    const blockNumber = Quantity.from((tx as any).blockNumber);
    const index = Quantity.from((tx as any).transactionIndex);

    // don't get the transaction if the requested transaction is _after_ our
    // fallback's blocknumber because it doesn't exist in our local chain.
    if (!fallback.isValidForkBlockNumber(blockNumber)) return null;

    return serializeRpcForDb(tx, blockHash, blockNumber, index);
  };

  public async getRaw(transactionHash: Buffer): Promise<Buffer> {
    return super.getRaw(transactionHash).then(block => {
      if (block == null && this.#blockchain.fallback) {
        return this.fromFallback(transactionHash);
      }
      return block;
    });
  }

  public async get(key: string | Buffer) {
    const factory = (await super.get(key)) as TransactionFactory;
    if (!factory) return null;
    return factory.tx;
  }
  /**
   * Adds the transaction to the transaction pool.
   *
   * Returns a promise that is only resolved in the order it was added.
   *
   * @param transaction -
   * @param secretKey -
   * @returns `true` if the `transaction` is immediately executable, `false` if
   * it may be valid in the future. Throws if the transaction is invalid.
   */
  public async add(transaction: TypedTransaction, secretKey?: Data) {
    if (this.#paused) {
      await this.#resumer;
    }
    // Because ganache requires determinism, we can't allow varying IO times to
    // potentially affect the order in which transactions are inserted into the
    // pool, so we use a FIFO queue to _return_ transaction insertions in the
    // order the were received.
    const insertion = this.transactionPool.prepareTransaction(
      transaction,
      secretKey
    );
    const result = await this.#queue.add(insertion);

    if (result) {
      this.transactionPool.drain();
    }
    return result;
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
    this.#queue.clear(false);
    this.transactionPool.clear();
  }

  /**
   * Stop processing _new_ transactions; puts new requests in a queue. Has no
   * affect if already paused.
   */
  public async pause() {
    if (!this.#paused) {
      // stop processing new transactions immediately
      this.#paused = true;
      this.#resumer = new Promise(resolve => {
        this.#resolver = resolve;
      });
    }

    // then wait until all async things we were already processing are done
    // before returning
    if (this.#queue.isBusy()) {
      await this.#queue.emit("idle");
    }
  }

  /**
   * Resume processing transactions. Has no effect if not paused.
   */
  public resume = () => {
    if (!this.#paused) return;

    this.#paused = false;
    this.#resolver();
  };
}
