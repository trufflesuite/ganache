import params from "./things/params";
import {utils} from "@ganache/utils";
import Transaction from "./things/transaction";
import {Quantity, Data} from "@ganache/utils";
import {promisify} from "util";
import Trie from "merkle-patricia-tree";
import Emittery from "emittery";
import Block from "ethereumjs-block";
import VM from "ethereumjs-vm";
import {encode as rlpEncode} from "rlp";

const putInTrie = (trie: Trie, key: Buffer, val: Buffer) => promisify(trie.put.bind(trie))(key, val);

function replaceFromHeap(
  priced: utils.Heap<Transaction>,
  source: utils.Heap<Transaction>
) {
  // get the next best for this account, removing from the source Heap:
  const next = source.peek();
  if (next) {
    // remove the current best priced transaction from this account and replace
    // replace it with the account's next lowest nonce transaction:
    priced.replaceBest(next);
    next.locked = true;
    return true;
  } else {
    // since we don't have a next, just remove this item from priced
    return priced.removeBest();
  }
}

type MinerOptions = {
  gasLimit?: Quantity;
  instamine: boolean
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
  readonly #createBlock: (previousBlock: Block) => Block;

  // create a Heap that sorts by gasPrice
  readonly #priced = new utils.Heap<Transaction>(byPrice);
  constructor(vm: VM, createBlock: (previousBlock: Block) => Block, options: MinerOptions) {
    super();
    const stateManager = vm.stateManager;

    this.#vm = vm;
    this.#options = options;
    this.#checkpoint = promisify(stateManager.checkpoint.bind(stateManager));
    this.#commit = promisify(stateManager.commit.bind(stateManager));
    this.#revert = promisify(stateManager.revert.bind(stateManager));
    this.#createBlock = createBlock;

    // initialize the heap with an empty array
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
   * 
   * @param maxTransactions: maximum number of transactions per block. If `-1`,
   * unlimited.
   */
  public async mine(pending: Map<string, utils.Heap<Transaction>>, block: Block, maxTransactions: number = -1) {
    // only allow mining a single block at a time (per miner)
    if (this.#isMining) {
      // if we are currently mining a block, set the `pending` property
      // so the miner knows it should immediately mine another block once it is
      // done with its current work.
      this.#pending = pending;
      this.#updatePricedHeap(pending);
      return;
    } else {
      this.#setPricedHeap(pending);
    }

    const lastBlock = await this.#mineTxs(pending, block, maxTransactions);

    // if there are more txs to mine, mine them!
    if (maxTransactions !== 0 && this.#pending) {
      const nextBlock = this.#createBlock(lastBlock);
      const pending = this.#pending;
      this.#pending = null;
      this.mine(pending, nextBlock, this.#options.instamine ? 1 : -1);
    }
  }

  #mineTxs = async (pending: Map<string, utils.Heap<Transaction>>, block: Block, maxTransactions: number) => {
    let keepMining = true;
    const priced = this.#priced;
    do {
      keepMining = false;
      this.#isMining = true;

      const blockTransactions: Transaction[] = [];
      const transactionsTrie = new Trie(null, null);
      const receiptTrie = new Trie(null, null);

      const blockLogs = [];
      const blockData = {
        blockTransactions,
        transactionsTrie,
        receiptTrie,
        gasUsed: 0n,
        timestamp: block.header.timestamp,
        logs: blockLogs
      };

      // don't mine anything at all if maxTransactions is `0`
      if (maxTransactions === 0) {
        await this.#checkpoint();
        await this.#commit();
        this.emit("block", blockData);
        this.#reset();
        return block;
      }

      let numTransactions = 0;
      let blockGasLeft = this.#options.gasLimit.toBigInt();

      const promises: Promise<any>[] = [];

      // Set a block-level checkpoint so our unsaved trie doesn't update the
      // vm's "live" trie.
      await this.#checkpoint();

      // TODO: get a real block?
      const blockBloom = block.header.bloom;

      // Run until we run out of items, or until the inner loop stops us.
      // we don't call `shift()` here because we will may need to `replace`
      // this `best` transaction with the next best transaction from the same
      // origin later.
      let best: Transaction;
      while ((best = priced.peek())) {
        if (best.calculateIntrinsicGas() > blockGasLeft) {
          // if the current best transaction can't possibly fit in this block
          // go ahead and run the next best transaction, ignoring all other
          // pending transactions from this account for this block.
          //  * We don't replace this "best" tranasction with another from the
          // same account.
          //  * We do "unlock" this transaction in the transaction pool's `pending`
          // queue so it can be replaced, if needed.
          priced.removeBest();
          best.locked = false;
          continue;
        }

        const origin = Data.from(best.from).toString();

        this.#currentlyExecutingPrice = Quantity.from(best.gasPrice).toBigInt();

        const runArgs = {
          tx: best as any,
          block
        };
        // Set a transaction-level checkpoint so we can undo state changes in
        // the case where the transaction is rejected by the VM.
        await this.#checkpoint();

        const result = await this.#runTx(runArgs, origin, pending);
        const gasUsed = Quantity.from(result.gasUsed.toBuffer()).toBigInt();
        if (blockGasLeft >= gasUsed) {
          // if the transaction will fit in the block, commit it!
          await this.#commit();
          blockTransactions[numTransactions] = best;
          
          blockGasLeft -= gasUsed;
          blockData.gasUsed += gasUsed;
          
          // calculate receipt and tx tries
          const receipt = best.fillFromResult(result);
          const txKey = rlpEncode(numTransactions);
          promises.push(putInTrie(transactionsTrie, txKey, best.serialize()));
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

          // if we:
          //  * don't have enough gas left for even the smallest of transactions
          //  * Or if we've mined enough transactions
          // we're done with this block!
          // notice: when `maxTransactions` is `-1` (AKA infinite), `numTransactions === maxTransactions`
          // will always return false, so this comparison works out fine.
          if (blockGasLeft <= params.TRANSACTION_GAS || numTransactions === maxTransactions) {
            if (keepMining) {
              // remove the newest (`best`) tx from this account's pending queue
              // as we know we can fit another transaction in the block. Stick
              // this tx into our `priced` heap.
              keepMining = replaceFromHeap(priced, pendingOrigin);
            } else {
              keepMining = priced.removeBest();
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
            keepMining = priced.removeBest();
          }
        } else {
          await this.#revert();

          // unlock the transaction so the transaction pool can reconsider this
          // transaction
          best.locked = false;

          // didn't fit. remove it from the priced transactions without replacing
          // it with another from the account. This transaction will have to be
          // run again in another block.
          keepMining = priced.removeBest();
        }
      }

      await Promise.all(promises);
      await this.#commit();
      this.emit("block", blockData);

      if (priced.length !== 0) {
        maxTransactions = this.#options.instamine ? 1 : -1;
        block = this.#createBlock(block);
        this.#currentlyExecutingPrice = 0n;
      } else {
        // reset the miner
        this.#reset();
      }
    }
    while (keepMining);
    
    return block;
  }

  #runTx = async (runArgs: any, origin: string, pending: Map<string, utils.Heap<Transaction>>) => {
    try {
      return await this.#vm.runTx(runArgs);
    } catch (err) {
      await this.#revert();
      const errorMessage = err.message;
      if (errorMessage.startsWith("the tx doesn't have the correct nonce. account has nonce of: ")) {
        // a race condition between the pool and the miner could potentially
        // cause this issue.
        // We do NOT want to re-run this transaction.
        // Update the `priced` heap with the next best transaction from this
        // account
        replaceFromHeap(this.#priced, pending.get(origin));

        // TODO: how do we surface this error to the caller?
        throw err;
      } else {
        // TODO: handle all other errors!
        // TODO: how do we surface this error to the caller?
        throw err;
      }
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
      const next = heap.peek();
      if (next && !next.locked) {
        const origin = Data.from(next.from).toString();
        origins.add(origin);
        priced.push(next);
        next.locked = true;
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
      if (next && !next.locked) {
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
        next.locked = true;
      }
    }
  };
}
