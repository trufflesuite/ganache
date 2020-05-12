import params from "./things/params";
import {utils} from "@ganache/utils";
import Transaction from "./things/transaction";
import {Quantity, Data} from "@ganache/utils/src/things/json-rpc";
import {promisify} from "util";
import Trie from "merkle-patricia-tree";
import Emittery from "emittery";
import Block from "ethereumjs-block";
import VM from "ethereumjs-vm";
import {RunTxResult} from "ethereumjs-vm/dist/runTx";
import {encode as rlpEncode} from "rlp";

const putInTrie = (trie: Trie, key: Buffer, val: Buffer) => promisify(trie.put.bind(trie))(key, val);

function replaceFromHeap(
  priced: utils.Heap<Transaction>,
  source: utils.Heap<Transaction>,
  pending: Map<string, utils.Heap<Transaction>>,
  key: string
) {
  // get the next best for this account, removing from the source Heap:
  const next = source.shift();
  if (next) {
    // remove the current best priced transaction from this account and replace
    // replace it with the account's next lowest nonce transaction:
    priced.replaceBest(next);
  } else {
    // since we don't have a next, just remove this item from priced
    priced.removeBest();
  }
}

type MinerOptions = {
  gasLimit?: Quantity;
};

function byPrice(values: Transaction[], a: number, b: number) {
  return Quantity.from(values[a].gasPrice) > Quantity.from(values[b].gasPrice);
}

export default class Miner extends Emittery {
  #currentlyExecutingPrice = 0n;
  #origins = new Set<string>();
  #pending: Map<string, utils.Heap<Transaction>>;
  #isMining: boolean = false;
  readonly #options: MinerOptions;
  readonly #vm: VM;
  readonly #checkpoint: () => Promise<any>;
  readonly #commit: () => Promise<any>;
  readonly #revert: () => Promise<any>;

  // initialize a Heap that sorts by gasPrice
  readonly #priced = new utils.Heap<Transaction>(byPrice);
  constructor(vm: VM, options: MinerOptions) {
    super();
    this.#vm = vm;
    this.#options = options;
    const stateManager = vm.stateManager;
    this.#checkpoint = promisify(stateManager.checkpoint.bind(stateManager));
    this.#commit = promisify(stateManager.commit.bind(stateManager));
    this.#revert = promisify(stateManager.revert.bind(stateManager));

    // init the heap with an empty array
    this.#priced.init([]);
  }

  /**
   *
   * @param pending A live Map of pending transactions from the transaction
   * pool. The miner will update this Map by removing the best transactions
   * and putting them in a block.
   * It is possible the miner will not empty the Map if it can't fit all
   * transactions within a single block. The remaining items will be left in
   * the pending pool to be eligible for mining in the future.
   */
  public async mine(pending: Map<string, utils.Heap<Transaction>>, block: Block) {
    // only allow mining a single block at a time (per miner)
    if (this.#isMining) {
      // if we are currently mining a block, set the `pending` property
      // so the miner knows it should immediately mine another block once it is
      //  done with its current work.
      this.#pending = pending;
      this.#updatePricedHeap(pending);
      return;
    } else {
      this.#setPricedHeap(pending);
    }
    this.#isMining = true;

    const blockTransactions: Transaction[] = [];

    let blockGasLeft = this.#options.gasLimit.toBigInt();

    let counter = 0;
    const transactionsTrie = new Trie(null, null);
    const receiptTrie = new Trie(null, null);
    const promises: Promise<any>[] = [];

    await this.#checkpoint();

    const priced = this.#priced;
    const rejectedTransactions: Transaction[] = [];
    const blockData = {
      blockTransactions,
      transactionsTrie,
      receiptTrie,
      gasUsed: 0n
    };

    // Run until we run out of items, or until the inner loop stops us.
    // we don't call `shift()` here because we will will probably need to
    // `replace` this top transaction with the next top transaction from the same
    // origin.
    let best: Transaction;
    while ((best = priced.peek())) {
      // if the current best transaction can't possibly fit in this block
      // go ahead and run the next best transaction, ignoring all other
      // pending transactions from this account for this block.
      if (best.calculateIntrinsicGas() > blockGasLeft) {
        priced.removeBest();
        rejectedTransactions.push(best);
        continue;
      }

      // TODO: get a real block
      const blockHeader = block.header;
      const blockBloom = blockHeader.bloom;

      const origin = Data.from(best.from).toString();
      const pendingFromOrigin = pending.get(origin);

      this.#currentlyExecutingPrice = Quantity.from(best.gasPrice).toBigInt();

      const runArgs = {
        tx: best as any,
        block
      };
      await this.#checkpoint();
      let result: RunTxResult;
      try {
        result = await this.#vm.runTx(runArgs);
      } catch (err) {
        await this.#revert();
        const errorMessage = err.message;
        if (errorMessage.startsWith("the tx doesn't have the correct nonce. account has nonce of: ")) {
          // a race condition between the pool and the miner could potentially
          // cause this issue.
          // We do NOT want to re-run this transaction.
          // Update the `priced` heap with the next best transaction from this
          // account
          replaceFromHeap(priced, pendingFromOrigin, pending, origin);

          // TODO: how do we surface this error to the caller?
          throw err;
        } else {
          // TODO: handle all other errors!
          // TODO: how do we surface this error to the caller?
          throw err;
        }
      }

      const gasUsed = Quantity.from(result.gasUsed.toBuffer()).toBigInt();
      if (blockGasLeft >= gasUsed) {
        await this.#commit();

        blockGasLeft -= gasUsed;
        blockData.gasUsed += gasUsed;

        // calculate receipts and tries
        const rawReceipt = best.initializeReceipt(result);
        const txKey = rlpEncode(counter);
        promises.push(putInTrie(transactionsTrie, txKey, best.serialize()));
        promises.push(putInTrie(receiptTrie, txKey, rawReceipt));

        // update the block's bloom
        const bloom = result.bloom.bitvector;
        for (let i = 0; i < 256; i++) {
          blockBloom[i] |= bloom[i];
        }

        blockTransactions[counter] = best;

        counter++;

        // if we don't have enough gas left for even the smallest of
        // transactions we're done
        if (blockGasLeft <= params.TRANSACTION_GAS) {
          break;
        }

        // remove the current (`best`) item from the live pending queue as we
        // now know it will fit in the block.
        // update `priced` with the next best for this account:
        replaceFromHeap(priced, pendingFromOrigin, pending, origin);
      } else {
        await this.#revert();

        // didn't fit. remove it from the priced transactions without replacing
        // it with another from the account. This transaction will have to be
        // run again in the next block.
        priced.removeBest();
        rejectedTransactions.push(best);
      }
    }
    await Promise.all(promises);
    await this.#commit();

    // TODO: put the rejected transactions back in their original origin heaps
    rejectedTransactions.forEach(transaction => {
      // TODO: this transaction should probably be validated again...?
      console.log(transaction);
    });

    this.emit("block", blockData);

    // reset the miner (this sets _isMining back to false)
    this.#reset();

    if (this.#pending) {
      // TODO: hm... tricky... we know we need to mine a new block
      // but at what timestamp. We need to get the timestamp from `blockchain`, but so far,
      // we don't require the miner to know about the blockchain.
      // also, what if the previous block was mined with a timestamp, do we need to mine two blocks with that
      // same timestamp? uh, I think not.
      const nextBlock = new Block({
        parentHash: block.header.hash,
        number: Quantity.from(Quantity.from(block.header.number).toBigInt() + 1n).toBuffer(),
        coinbase: block.header.coinbase,
        timestamp: block.header.timestamp,
        difficulty: block.header.difficulty,
        gasLimit: block.header.gasLimit
      });
      this.mine(this.#pending, nextBlock);
      this.#pending = null;
    }
  }

  #reset = () => {
    this.#origins.clear();
    this.#priced.clear();
    this.#isMining = false;
    this.#currentlyExecutingPrice = 0n;
  };

  #setPricedHeap = (pending: Map<string, utils.Heap<Transaction>>) => {
    const origins = this.#origins;
    const priced = this.#priced;

    for (let mapping of pending) {
      const heap = mapping[1];
      const next = heap.shift();
      if (next) {
        const origin = Data.from(next.from).toString();
        origins.add(origin);
        priced.push(next);
      }
    }
  };

  #updatePricedHeap = (pending: Map<string, utils.Heap<Transaction>>) => {
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
      if (next) {
        const price = Quantity.from(next.gasPrice).toBigInt();
        if (this.#currentlyExecutingPrice < price) {
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
        heap.removeBest();
      }
    }
  };
}
