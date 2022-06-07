import type { InterpreterStep } from "@ethereumjs/vm/dist/evm/interpreter";
import {
  RuntimeError,
  RETURN_TYPES,
  TraceDataFactory,
  StorageKeys
} from "@ganache/ethereum-utils";
import {
  Quantity,
  BUFFER_EMPTY,
  BUFFER_256_ZERO,
  keccak,
  uintToBuffer,
  Heap
} from "@ganache/utils";
import { encode } from "@ganache/rlp";
import { BaseTrie as Trie } from "merkle-patricia-tree";
import Emittery from "emittery";
import VM from "@ethereumjs/vm";
import { EthereumInternalOptions } from "@ganache/ethereum-options";
import replaceFromHeap from "./replace-from-heap";
import { EVMResult } from "@ethereumjs/vm/dist/evm/evm";
import { Params, TypedTransaction } from "@ganache/ethereum-transaction";
import { Executables } from "./executables";
import { Block, RuntimeBlock } from "@ganache/ethereum-block";
import {
  makeStepEvent,
  VmAfterTransactionEvent,
  VmBeforeTransactionEvent,
  VmStepEvent
} from "../provider-events";
import { ConsoleLogs, maybeGetLogs } from "@trufflesuite/console.log";

/**
 * How many transactions should be in the block.
 */
export enum Capacity {
  /**
   * Keep mining transactions until there are no more transactions that can fit
   * in the block, or there are no transactions left to mine.
   */
  FillBlock = -1,
  /**
   * Mine an empty block, even if there are executable transactions available to
   * mine.
   */
  Empty = 0,
  /**
   * Mine a block with a single transaction, or empty if there are no executable
   * transactions available to mine.
   */
  Single = 1
}

export type BlockData = {
  blockTransactions: TypedTransaction[];
  transactionsTrie: Trie;
  receiptTrie: Trie;
  gasUsed: bigint;
  timestamp: Buffer;
  extraData: string;
};

const updateBloom = (blockBloom: Buffer, bloom: Buffer) => {
  let i = 256;
  while (--i) blockBloom[i] |= bloom[i];
};

const sortByPrice = (values: TypedTransaction[], a: number, b: number) =>
  values[a].effectiveGasPrice > values[b].effectiveGasPrice;

const refresher = (item: TypedTransaction, context: Quantity) =>
  item.updateEffectiveGasPrice(context);
export default class Miner extends Emittery<{
  block: {
    block: Block;
    serialized: Buffer;
    storageKeys: StorageKeys;
    transactions: TypedTransaction[];
  };
  "ganache:vm:tx:step": VmStepEvent;
  "ganache:vm:tx:before": VmBeforeTransactionEvent;
  "ganache:vm:tx:after": VmAfterTransactionEvent;
  "ganache:vm:tx:console.log": ConsoleLogs;
  idle: undefined;
}> {
  #currentlyExecutingPrice = 0n;
  #origins = new Set<string>();
  #pending: boolean;
  #isBusy: boolean = false;
  #paused: boolean = false;
  #resumer: Promise<void>;
  #currentBlockBaseFeePerGas: Quantity;
  #resolver: (value: void) => void;

  /**
   * Because step events are expensive, CPU-wise, to create and emit we only do
   * it conditionally.
   */
  #emitStepEvent: boolean = false;
  readonly #executables: Executables;
  readonly #options: EthereumInternalOptions["miner"];
  readonly #vm: VM;
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
  readonly #priced = new Heap<TypedTransaction, Quantity>(
    sortByPrice,
    refresher
  );
  /*
   * @param executables - A live Map of pending transactions from the transaction
   * pool. The miner will update this Map by removing the best transactions
   * and putting them in new blocks.
   */
  constructor(
    options: EthereumInternalOptions["miner"],
    executables: Executables,
    vm: VM,
    createBlock: (previousBlock: Block) => RuntimeBlock
  ) {
    super();

    this.#vm = vm;
    this.#options = options;
    this.#executables = executables;
    this.#createBlock = (previousBlock: Block) => {
      const newBlock = createBlock(previousBlock);
      this.#setCurrentBlockBaseFeePerGas(newBlock);
      return newBlock;
    };

    // initialize the heap with an empty array
    this.#priced.init([]);
  }

  /**
   * @param maxTransactions: - maximum number of transactions per block. If `-1`,
   * unlimited.
   * @param onlyOneBlock: - set to `true` if only 1 block should be mined.
   *
   * @returns the transactions mined in the _first_ block
   */
  public async mine(
    block: RuntimeBlock,
    maxTransactions: number | Capacity = Capacity.FillBlock,
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
      this.#setCurrentBlockBaseFeePerGas(block);
      this.#setPricedHeap();
      const result = await this.#mine(block, maxTransactions, onlyOneBlock);
      this.emit("idle");
      return result;
    }
  }

  #mine = async (
    block: RuntimeBlock,
    maxTransactions: number | Capacity = Capacity.FillBlock,
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
        await this.#mine(nextBlock, maxTransactions);
      }
    }
    return transactions;
  };

  #mineTxs = async (
    runtimeBlock: RuntimeBlock,
    maxTransactions: number | Capacity,
    onlyOneBlock: boolean
  ) => {
    let block: Block;
    const vm = this.#vm;

    const { pending, inProgress } = this.#executables;
    const options = this.#options;

    let keepMining = true;
    const priced = this.#priced;
    const storageKeys: StorageKeys = new Map();
    let blockTransactions: TypedTransaction[];
    do {
      keepMining = false;
      this.#isBusy = true;

      blockTransactions = [];
      const transactionsTrie = new Trie(null, null);
      const receiptTrie = new Trie(null, null);

      // don't mine anything at all if maxTransactions is `0`
      if (maxTransactions === Capacity.Empty) {
        await vm.stateManager.checkpoint();
        await vm.stateManager.commit();
        const finalizedBlockData = runtimeBlock.finalize(
          transactionsTrie.root,
          receiptTrie.root,
          BUFFER_256_ZERO,
          (vm.stateManager as any)._trie.root,
          0n, // gas used
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
      const promises: Promise<void>[] = [];

      // Set a block-level checkpoint so our unsaved trie doesn't update the
      // vm's "live" trie.
      await vm.stateManager.checkpoint();

      const TraceData = TraceDataFactory();
      // We need to listen for any SSTORE opcodes so we can grab the raw, unhashed version
      // of the storage key and save it to the db along with it's keccak hashed version of
      // the storage key. Why you might ask? So we can reference the raw version in
      // debug_storageRangeAt.
      const stepListener = (
        event: InterpreterStep,
        next: (error?: any, cb?: any) => void
      ) => {
        switch (event.opcode.name) {
          case "SSTORE":
            const key = TraceData.from(
              event.stack[event.stack.length - 1].toArrayLike(Buffer)
            ).toBuffer();
            const hashedKey = keccak(key);
            storageKeys.set(hashedKey.toString(), { key, hashedKey });
            break;
          case "STATICCALL":
            const logs = maybeGetLogs(event);
            if (logs) {
              this.emit("ganache:vm:tx:console.log", logs);
            }
            break;
        }
        next();
      };

      vm.on("step", stepListener);
      // Run until we run out of items, or until the inner loop stops us.
      // we don't call `shift()` here because we will may need to `replace`
      // this `best` transaction with the next best transaction from the same
      // origin later.
      let best: TypedTransaction;
      while ((best = priced.peek())) {
        const origin = best.from.toString();

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

        this.#currentlyExecutingPrice = best.effectiveGasPrice.toBigInt();

        // Set a transaction-level checkpoint so we can undo state changes in
        // the case where the transaction is rejected by the VM.
        await vm.stateManager.checkpoint();

        // Set the internal trie's block number (for forking)
        (vm.stateManager as any)._trie.blockNumber = Quantity.from(
          runtimeBlock.header.number.toArrayLike(Buffer)
        );

        const result = await this.#runTx(best, runtimeBlock, origin, pending);
        if (result !== null) {
          const gasUsed = Quantity.from(
            result.gasUsed.toArrayLike(Buffer)
          ).toBigInt();
          if (blockGasLeft >= gasUsed) {
            // if the transaction will fit in the block, commit it!
            await vm.stateManager.commit();
            blockTransactions[numTransactions] = best;

            blockGasLeft -= gasUsed;
            blockGasUsed += gasUsed;

            // calculate receipt and tx tries
            const txKey = encode(
              numTransactions === 0
                ? BUFFER_EMPTY
                : uintToBuffer(numTransactions)
            );
            promises.push(transactionsTrie.put(txKey, best.serialized));
            const receipt = best.fillFromResult(result, blockGasUsed);
            promises.push(receiptTrie.put(txKey, receipt));

            // update the block's bloom
            updateBloom(blockBloom, result.bloom.bitvector);

            numTransactions++;

            const pendingOrigin = pending.get(origin);
            inProgress.add(best);
            best.once("finalized").then(() => {
              // it is in the database (or thrown out) so delete it from the
              // `inProgress` Set
              inProgress.delete(best);
            });

            // since this transaction was successful, remove it from the "pending"
            // transaction pool.
            const hasMoreFromOrigin = pendingOrigin.removeBest();
            if (hasMoreFromOrigin) {
              // remove the newest (`best`) tx from this account's pending queue
              // as we know we can fit another transaction in the block. Stick
              // this tx into our `priced` heap.
              keepMining = replaceFromHeap(priced, pendingOrigin);
            } else {
              // since we don't have any more txs from this account, just get the
              // next best transaction sorted in our `priced` heap.
              keepMining = this.#removeBestAndOrigin(origin);
            }
            // if we:
            //  * don't have enough gas left for even the smallest of transactions
            //  * Or if we've mined enough transactions
            // we're done with this block!
            // notice: when `maxTransactions` is `-1` (AKA infinite), `numTransactions === maxTransactions`
            // will always return false, so this comparison works out fine.
            if (
              blockGasLeft <= Params.TRANSACTION_GAS ||
              numTransactions === maxTransactions
            ) {
              break;
            }
          } else {
            // didn't fit in the current block
            await vm.stateManager.revert();

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
          await vm.stateManager.revert();
        }
      }

      await Promise.all(promises);
      await vm.stateManager.commit();

      vm.removeListener("step", stepListener);

      const finalizedBlockData = runtimeBlock.finalize(
        transactionsTrie.root,
        receiptTrie.root,
        blockBloom,
        (vm.stateManager as any)._trie.root,
        blockGasUsed,
        options.extraData,
        blockTransactions,
        storageKeys
      );
      block = finalizedBlockData.block;
      this.emit("block", finalizedBlockData);

      if (onlyOneBlock) {
        this.#currentlyExecutingPrice = 0n;
        this.#reset();
        break;
      } else {
        this.#currentlyExecutingPrice = 0n;
        this.#updatePricedHeap();

        if (priced.length !== 0) {
          runtimeBlock = this.#createBlock(block);
          // if baseFeePerGas is undefined, we are pre london hard fork.
          // no need to refresh the order of the heap because all Txs only have gasPrice.
          if (this.#currentBlockBaseFeePerGas !== undefined) {
            priced.refresh(this.#currentBlockBaseFeePerGas);
          }
        } else {
          // reset the miner
          this.#reset();
        }
      }
    } while (keepMining);

    return { block, transactions: blockTransactions };
  };

  #runTx = async (
    tx: TypedTransaction,
    block: RuntimeBlock,
    origin: string,
    pending: Map<string, Heap<TypedTransaction, Quantity>>
  ) => {
    const context = {};
    const vm = this.#vm;
    this.emit("ganache:vm:tx:before", { context });
    // we always listen to the step event even if `#emitStepEvent` is false in
    // case the user starts listening in the middle of the transaction.
    const stepListener = event => {
      if (!this.#emitStepEvent) return;
      this.emit("ganache:vm:tx:step", makeStepEvent(context, event));
    };
    vm.on("step", stepListener);
    try {
      return await vm.runTx({
        tx: tx.toVmTransaction() as any,
        block: block as any
      });
    } catch (err: any) {
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
      } as EVMResult;
      const error = new RuntimeError(tx.hash, e, RETURN_TYPES.TRANSACTION_HASH);
      tx.finalize("rejected", error);
      return null;
    } finally {
      vm.removeListener("step", stepListener);
      this.emit("ganache:vm:tx:after", { context });
    }
  };

  #removeBestAndOrigin = (origin: string) => {
    this.#origins.delete(origin);
    return this.#priced.removeBest();
  };

  #reset = () => {
    this.#origins.clear();
    // HACK: see: https://github.com/trufflesuite/ganache/issues/3093
    //
    //When the priced heap is reset, meaning we're clearing out the heap
    // and origins list to be set again when the miner is called, loop over
    // the priced heap transactions and "unlock" them (set tx.locked = false)
    //
    // The real fix would include fixing the use of locked, as it's
    // currently overloaded to mean "is in priced heap" and also "is being
    // mined".
    const priced = this.#priced;
    const length = priced.length;
    const pricedArray = priced.array;
    for (let i = 0; i < length; i++) {
      const bestFromOrigin = pricedArray[i];
      bestFromOrigin.locked = false;
    }
    priced.clear();
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
      const next: TypedTransaction = heap.peek();
      if (next && !next.locked) {
        const origin = next.from.toString();
        origins.add(origin);
        next.updateEffectiveGasPrice(this.#currentBlockBaseFeePerGas);
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
        const price = next.effectiveGasPrice.toBigInt();

        if (this.#currentlyExecutingPrice > price) {
          // don't insert a transaction into the miner's `priced` heap
          // if it will be better than its last
          continue;
        }
        const origin = next.from.toString();
        if (origins.has(origin)) {
          // don't insert a transaction into the miner's `priced` heap if it
          // has already queued up transactions for that origin
          continue;
        }
        origins.add(origin);
        next.updateEffectiveGasPrice(this.#currentBlockBaseFeePerGas);
        priced.push(next);
        next.locked = true;
      }
    }
  };

  public toggleStepEvent(enable: boolean) {
    this.#emitStepEvent = enable;
  }

  /**
   * Sets the #currentBlockBaseFeePerGas property if the current block
   * has a baseFeePerGas property
   */
  #setCurrentBlockBaseFeePerGas = (block: RuntimeBlock) => {
    const baseFeePerGas = block.header.baseFeePerGas;
    // before london hard fork, there will be no baseFeePerGas on the block
    this.#currentBlockBaseFeePerGas =
      baseFeePerGas === undefined
        ? undefined
        : Quantity.from(baseFeePerGas.buf);
  };
}
