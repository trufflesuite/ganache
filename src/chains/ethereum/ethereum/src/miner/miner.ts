import {
  params,
  Transaction,
  Block,
  RuntimeBlock,
  RuntimeError,
  RETURN_TYPES,
  Executables,
  TraceDataFactory,
  StepEvent,
  StorageKeys
} from "@ganache/ethereum-utils";
import { utils, Quantity, Data } from "@ganache/utils";
import { promisify } from "util";
import Trie from "merkle-patricia-tree";
import Emittery from "emittery";
import VM from "ethereumjs-vm";
import { encode as rlpEncode } from "rlp";
import { EthereumInternalOptions } from "@ganache/ethereum-options";
import replaceFromHeap from "./replace-from-heap";
const { BUFFER_EMPTY, BUFFER_256_ZERO, keccak } = utils;

export type BlockData = {
  blockTransactions: Transaction[];
  transactionsTrie: Trie;
  receiptTrie: Trie;
  gasUsed: bigint;
  timestamp: Buffer;
  extraData: string;
};

const putInTrie = (trie: Trie, key: Buffer, val: Buffer) =>
  promisify(trie.put.bind(trie))(key, val);

const sortByPrice = (values: Transaction[], a: number, b: number) =>
  Quantity.from(values[a].gasPrice) > Quantity.from(values[b].gasPrice);

export default class Miner extends Emittery.Typed<
  {
    block: {
      block: Block;
      serialized: Buffer;
      storageKeys: StorageKeys;
    };
  },
  "idle"
> {
  #currentlyExecutingPrice = 0n;
  #origins = new Set<string>();
  #pending: boolean;
  #isBusy: boolean = false;
  #paused: boolean = false;
  #resumer: Promise<void>;
  #resolver: (value: void) => void;
  readonly #executables: Executables;
  readonly #options: EthereumInternalOptions["miner"];
  readonly #instamine: boolean;
  readonly #vm: VM;
  readonly #checkpoint: () => Promise<any>;
  readonly #commit: () => Promise<any>;
  readonly #revert: () => Promise<any>;
  readonly #createBlock: (previousBlock: Block) => RuntimeBlock;

  public async pause() {
    if (!this.#paused) {
      this.#paused = true;
      this.#resumer = new Promise(resolve => {
        this.#resolver = resolve;
      });
    }

    if (this.#isBusy) {
      await this.once("idle");
    }
  }

  public resume() {
    if (!this.#paused) return;

    this.#paused = false;
    this.#resolver();
  }

  // create a Heap that sorts by gasPrice
  readonly #priced = new utils.Heap<Transaction>(sortByPrice);
  /*
   * @param executables A live Map of pending transactions from the transaction
   * pool. The miner will update this Map by removing the best transactions
   * and putting them in new blocks.
   */
  constructor(
    options: EthereumInternalOptions["miner"],
    executables: Executables,
    instamine: boolean,
    vm: VM,
    createBlock: (previousBlock: Block) => RuntimeBlock
  ) {
    super();
    const stateManager = vm.stateManager;

    this.#vm = vm;
    this.#options = options;
    this.#executables = executables;
    this.#instamine = instamine;
    this.#checkpoint = promisify(stateManager.checkpoint.bind(stateManager));
    this.#commit = promisify(stateManager.commit.bind(stateManager));
    this.#revert = promisify(stateManager.revert.bind(stateManager));
    this.#createBlock = createBlock;

    // initialize the heap with an empty array
    this.#priced.init([]);
  }

  /**
   * @param maxTransactions: maximum number of transactions per block. If `-1`,
   * unlimited.
   * @param onlyOneBlock: set to `true` if only 1 block should be mined.
   *
   * @returns the transactions mined in the _first_ block
   */
  public async mine(
    block: RuntimeBlock,
    maxTransactions: number = -1,
    onlyOneBlock = false
  ) {
    if (this.#paused) {
      await this.#resumer;
    }

    // only allow mining a single block at a time (per miner)
    if (this.#isBusy) {
      // if we are currently mining a block, set the `pending` property
      // so the miner knows it can immediately start mining another block once
      // it is done with its current work.
      this.#pending = true;
      this.#updatePricedHeap();
      return;
    } else {
      this.#setPricedHeap();
      const result = await this.#mine(block, maxTransactions, onlyOneBlock);
      this.emit("idle");
      return result;
    }
  }

  #mine = async (
    block: RuntimeBlock,
    maxTransactions: number = -1,
    onlyOneBlock = false
  ) => {
    const { block: lastBlock, transactions } = await this.#mineTxs(
      block,
      maxTransactions,
      onlyOneBlock
    );

    // if there are more txs to mine, start mining them without awaiting their
    // result.
    if (this.#pending) {
      this.#setPricedHeap();
      this.#pending = false;
      if (!onlyOneBlock && this.#priced.length > 0) {
        const nextBlock = this.#createBlock(lastBlock);
        await this.#mine(nextBlock, this.#instamine ? 1 : -1);
      }
    }
    return transactions;
  };

  #mineTxs = async (
    runtimeBlock: RuntimeBlock,
    maxTransactions: number,
    onlyOneBlock: boolean
  ) => {
    let block: Block;

    const { pending, inProgress } = this.#executables;
    const options = this.#options;

    let keepMining = true;
    const priced = this.#priced;
    const legacyInstamine = this.#options.legacyInstamine;
    const storageKeys: StorageKeys = new Map();
    let blockTransactions: Transaction[];
    do {
      keepMining = false;
      this.#isBusy = true;

      blockTransactions = [];
      const transactionsTrie = new Trie(null, null);
      const receiptTrie = new Trie(null, null);

      // don't mine anything at all if maxTransactions is `0`
      if (maxTransactions === 0) {
        await this.#checkpoint();
        await this.#commit();
        const finalizedBlockData = runtimeBlock.finalize(
          transactionsTrie.root,
          receiptTrie.root,
          BUFFER_256_ZERO,
          this.#vm.stateManager._trie.root,
          BUFFER_EMPTY, // gas used
          options.extraData,
          [],
          storageKeys
        );
        this.emit("block", finalizedBlockData);
        this.#reset();
        return { block: finalizedBlockData.block, transactions: [] };
      }

      let numTransactions = 0;
      let blockGasLeft = options.blockGasLimit.toBigInt();
      let blockGasUsed = 0n;

      const blockBloom = Buffer.allocUnsafe(256).fill(0);
      const promises: Promise<never>[] = [];

      // Set a block-level checkpoint so our unsaved trie doesn't update the
      // vm's "live" trie.
      await this.#checkpoint();

      const TraceData = TraceDataFactory();
      // We need to listen for any SSTORE opcodes so we can grab the raw, unhashed version
      // of the storage key and save it to the db along with it's keccak hashed version of
      // the storage key. Why you might ask? So we can reference the raw version in
      // debug_storageRangeAt.
      const stepListener = (
        event: StepEvent,
        next: (error?: any, cb?: any) => void
      ) => {
        if (event.opcode.name === "SSTORE") {
          const key = TraceData.from(
            event.stack[event.stack.length - 1].toArrayLike(Buffer)
          ).toBuffer();
          const hashedKey = keccak(key);
          storageKeys.set(hashedKey.toString(), { key, hashedKey });
        }
        next();
      };

      this.#vm.on("step", stepListener);
      // Run until we run out of items, or until the inner loop stops us.
      // we don't call `shift()` here because we will may need to `replace`
      // this `best` transaction with the next best transaction from the same
      // origin later.
      let best: Transaction;
      while ((best = priced.peek())) {
        const origin = Data.from(best.from).toString();

        if (best.calculateIntrinsicGas() > blockGasLeft) {
          // if the current best transaction can't possibly fit in this block
          // go ahead and run the next best transaction, ignoring all other
          // pending transactions from this account for this block.
          //  * We don't replace this "best" transaction with another from the
          // same account.
          //  * We do "unlock" this transaction in the transaction pool's `pending`
          // queue so it can be replaced, if needed.
          best.locked = false;
          this.#removeBestAndOrigin(origin);
          continue;
        }

        this.#currentlyExecutingPrice = Quantity.from(best.gasPrice).toBigInt();

        // Set a transaction-level checkpoint so we can undo state changes in
        // the case where the transaction is rejected by the VM.
        await this.#checkpoint();

        const result = await this.#runTx(best, runtimeBlock, origin, pending);
        if (result !== null) {
          const gasUsed = Quantity.from(
            result.gasUsed.toArrayLike(Buffer)
          ).toBigInt();
          if (blockGasLeft >= gasUsed) {
            // if the transaction will fit in the block, commit it!
            await this.#commit();
            blockTransactions[numTransactions] = best;

            blockGasLeft -= gasUsed;
            blockGasUsed += gasUsed;

            // calculate receipt and tx tries
            const txKey = rlpEncode(numTransactions);
            promises.push(putInTrie(transactionsTrie, txKey, best.serialize()));
            const receipt = best.fillFromResult(result, blockGasUsed);
            promises.push(putInTrie(receiptTrie, txKey, receipt));

            // update the block's bloom
            const bloom = result.bloom.bitvector;
            for (let i = 0; i < 256; i++) {
              blockBloom[i] |= bloom[i];
            }

            numTransactions++;

            const pendingOrigin = pending.get(origin);
            // since this transaction was successful, remove it from the "pending"
            // transaction pool.
            keepMining = pendingOrigin.removeBest();
            inProgress.add(best);
            best.once("finalized").then(() => {
              // it is in the database (or thrown out) so delete it from the
              // `inProgress` Set
              inProgress.delete(best);
            });

            // if we:
            //  * don't have enough gas left for even the smallest of transactions
            //  * Or if we've mined enough transactions
            // we're done with this block!
            // notice: when `maxTransactions` is `-1` (AKA infinite), `numTransactions === maxTransactions`
            // will always return false, so this comparison works out fine.
            if (
              blockGasLeft <= params.TRANSACTION_GAS ||
              numTransactions === maxTransactions
            ) {
              if (keepMining) {
                // remove the newest (`best`) tx from this account's pending queue
                // as we know we can fit another transaction in the block. Stick
                // this tx into our `priced` heap.
                keepMining = replaceFromHeap(priced, pendingOrigin);
              } else {
                keepMining = this.#removeBestAndOrigin(origin);
              }
              break;
            }

            if (keepMining) {
              // remove the newest (`best`) tx from this account's pending queue
              // as we know we can fit another transaction in the block. Stick
              // this tx into our `priced` heap.
              keepMining = replaceFromHeap(priced, pendingOrigin);
            } else {
              // since we don't have any more txs from this account, just get the
              // next bext transaction sorted in our `priced` heap.
              keepMining = this.#removeBestAndOrigin(origin);
            }
          } else {
            // didn't fit in the current block
            await this.#revert();

            // unlock the transaction so the transaction pool can reconsider this
            // transaction
            best.locked = false;

            // didn't fit. remove it from the priced transactions without replacing
            // it with another from the account. This transaction will have to be
            // run again in another block.
            keepMining = priced.removeBest();
          }
        } else {
          // no result means the transaction is an "always failing tx", so we
          // revert its changes here.
          // Note: we don't clean up (`removeBest`, etc) because `runTx`'s
          // error handler does the clean up itself.
          await this.#revert();
        }
      }

      await Promise.all(promises);
      await this.#commit();

      this.#vm.removeListener("step", stepListener);

      const finalizedBlockData = runtimeBlock.finalize(
        transactionsTrie.root,
        receiptTrie.root,
        blockBloom,
        this.#vm.stateManager._trie.root,
        blockGasUsed === 0n
          ? BUFFER_EMPTY
          : Quantity.from(blockGasUsed).toBuffer(),
        options.extraData,
        blockTransactions,
        storageKeys
      );
      block = finalizedBlockData.block;
      const emitBlockProm = this.emit("block", finalizedBlockData);
      if (legacyInstamine === true) {
        // we need to wait for each block to be done mining when in legacy
        // mode because things like `mine` and `miner_start` must wait for the
        // first mine operation to be fully complete.
        await emitBlockProm;
      }

      if (onlyOneBlock) {
        this.#currentlyExecutingPrice = 0n;
        this.#reset();
        break;
      } else {
        this.#currentlyExecutingPrice = 0n;
        this.#updatePricedHeap();

        if (priced.length !== 0) {
          maxTransactions = this.#instamine ? 1 : -1;
          runtimeBlock = this.#createBlock(block);
        } else {
          // reset the miner
          this.#reset();
        }
      }
    } while (keepMining);

    return { block, transactions: blockTransactions };
  };

  #runTx = async (
    tx: Transaction,
    block: RuntimeBlock,
    origin: string,
    pending: Map<string, utils.Heap<Transaction>>
  ) => {
    try {
      return await this.#vm.runTx({ tx, block } as any);
    } catch (err) {
      const errorMessage = err.message;
      // We do NOT want to re-run this transaction.
      // Update the `priced` heap with the next best transaction from this
      // account
      const pendingOrigin = pending.get(origin);
      if (pendingOrigin.removeBest()) {
        replaceFromHeap(this.#priced, pendingOrigin);
      } else {
        // if there are no more transactions from this origin remove this tx
        // from the priced heap and clear out it's origin so it can accept new
        // transactions from this origin.
        this.#removeBestAndOrigin(origin);
      }

      const e = {
        execResult: {
          runState: { programCounter: 0 },
          exceptionError: { error: errorMessage },
          returnValue: BUFFER_EMPTY
        }
      };
      tx.finalize(
        "rejected",
        new RuntimeError(tx.hash(), e as any, RETURN_TYPES.TRANSACTION_HASH)
      );
      return null;
    }
  };

  #removeBestAndOrigin = (origin: string) => {
    this.#origins.delete(origin);
    return this.#priced.removeBest();
  };

  #reset = () => {
    this.#origins.clear();
    this.#priced.clear();
    this.#isBusy = false;
  };

  /**
   * Adds one transaction from each origin into the "priced" heap, which
   * sorts each tx by gasPrice (high to low)
   */
  #setPricedHeap = () => {
    const { pending } = this.#executables;
    const origins = this.#origins;
    const priced = this.#priced;

    for (let mapping of pending) {
      const heap = mapping[1];
      const next = heap.peek();
      if (next && !next.locked) {
        const origin = Data.from(next.from).toString();
        origins.add(origin);
        priced.push(next);
        next.locked = true;
      }
    }
  };

  /**
   * Updates the "priced" heap with transactions from origins it doesn't yet
   * contain.
   */
  #updatePricedHeap = () => {
    const { pending } = this.#executables;
    const origins = this.#origins;
    const priced = this.#priced;
    // Note: the `pending` Map passed here is "live", meaning it is constantly
    // being updated by the `transactionPool`. This allows us to begin
    // processing a block with the _current_ pending transactions, and while
    // that is processing, to receive new transactions, updating our `priced`
    // heap with these new pending transactions.
    for (let mapping of pending) {
      const heap = mapping[1];
      const next = heap.peek();
      if (next && !next.locked) {
        const price = Quantity.from(next.gasPrice).toBigInt();

        if (this.#currentlyExecutingPrice > price) {
          // don't insert a transaction into the miner's `priced` heap
          // if it will be better than its last
          continue;
        }
        const origin = Data.from(next.from).toString();
        if (origins.has(origin)) {
          // don't insert a transaction into the miner's `priced` heap if it
          // has already queued up transactions for that origin
          continue;
        }
        origins.add(origin);
        priced.push(next);
        next.locked = true;
      }
    }
  };
}
