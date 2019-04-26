import { Block } from "../../ledgers/ethereum/components/block-manager"
import params from "../../types/params";
import Heap from "../../utils/heap";
import Transaction from "../../types/transaction";
import { JsonRpcQuantity, JsonRpcData } from "../../types/json-rpc";
import { promisify } from "util";
import Trie from "merkle-patricia-tree";
import { rlp } from "ethereumjs-util";

const putInTrie = (trie: Trie, key: Buffer, val: Buffer) => promisify(trie.put.bind(trie))(key, val);

function replaceFromHeap(priced: Heap<Transaction>, source: Heap<Transaction>, pending: Map<string, Heap<Transaction>>, key: string) {
  // get the next best for this account:
  const next = source.peek();
  if (next) {
    // remove the current best priced transaction from this 
    // account and replace it with the account's next lowest
    // nonce transaction:
    priced.replaceBest(next);
  } else {
    // since we don't have a next, just remove this item from
    // priced and delete the Heap from `pending` as it is now
    // empty.
    pending.delete(key)
    priced.removeBest();
  }
}

type MinerOptions = {
  gasLimit?: JsonRpcQuantity
}

function byPrice(values: Transaction[], a: number, b: number) {
  return JsonRpcQuantity.from(values[a].gasPrice) > JsonRpcQuantity.from(values[b].gasPrice);
}

export default class Miner {
  private readonly options: MinerOptions;
  private readonly vm: any
  private readonly _runTx: ({ tx: { } }) => Promise<any>;
  private readonly _checkpoint: () => Promise<any>;
  private readonly _commit: () => Promise<any>;
  private readonly _revert: () => Promise<any>;

  // initialize a Heap that sorts by gasPrice
  private readonly priced = new Heap<Transaction>(byPrice);;
  constructor(vm: any, options: MinerOptions) {
    this.vm = vm;
    this.options = options;
    this._runTx = promisify(vm.runTx.bind(vm));
    const stateManager = vm.stateManager;
    this._checkpoint = promisify(stateManager.checkpoint.bind(stateManager));
    this._commit = promisify(stateManager.commit.bind(stateManager));
    this._revert = promisify(stateManager.revert.bind(stateManager));

    // init the heap with an empty array
    this.priced.init([]);
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
  public async mine(pending: Map<string, Heap<Transaction>>) {
    const priced = this.priced;
    const blockTransactions: any[] = [];
    for (let mapping of pending) {
      const next = mapping[1].peek();
      if (next) {
        priced.push(next);
      }
    }

    let blockGasLeft = this.options.gasLimit.toBigInt();
    let best: Transaction;
    let counter = 0;
    const transactionTrie = new Trie(null, null);
    const receiptTrie = new Trie(null, null);
    const promises: Promise<any>[] = [];
    // Run until we run out of items, or until the inner loop stops us
    while (best = priced.peek()) {
      // if the current best transaction can't possibly fit in this block
      // go ahead and run the next best transaction, ignoring all other
      // pending transactions from this account.
      if (best.calculateIntrinsicGas() > blockGasLeft) {
        priced.removeBest();
        continue;
      }
      const origin = JsonRpcData.from(best.from).toString();
      const pendingFromOrigin = pending.get(origin);

      const runArgs = {
        tx: best
      };
      await this._checkpoint();
      const result = await this._runTx(runArgs).catch((err: Error) => ({ err }));
      if (result.err) {
        await this._revert();
        const errorMessage = result.err.message;
        if (errorMessage.startsWith("the tx doesn't have the correct nonce. account has nonce of: ")) {
          // update `priced` with the next best for this account:
          replaceFromHeap(priced, pendingFromOrigin, pending, origin);
        }
        continue;
      }

      await this._commit();
      const gasUsed = JsonRpcQuantity.from(result.gasUsed.toBuffer()).toBigInt();
      if (blockGasLeft >= gasUsed) {
        blockGasLeft -= gasUsed;

        const resultVm = result.vm;
        const txLogs = resultVm.logs || [];
        // result.vm.exception is flipped so 1=0 and 0=1. :facepalm:
        const status = resultVm.exception ? 1 : 0;
        const bitVector = result.bloom.bitvector;
        const rawReceipt = [
          status,
          result.gasUsed.toBuffer(),
          bitVector,
          txLogs
        ];
        const rcptBuffer = rlp.encode(rawReceipt);
        const key = rlp.encode(counter);
        promises.push(putInTrie(transactionTrie, key, best.serialize()));
        promises.push(putInTrie(receiptTrie, key, rcptBuffer));

        // remove the current (`best`) item from the pending queue as we
        // now know it will fit in the block.
        pendingFromOrigin.removeBest();

        // We've found ourselves a block. Yeehaw!
        blockTransactions.push(best);

        await promises;

        // if we don't have enough gas for even the smallest of
        // transactions we're done, clear `priced` & break the loop
        if (blockGasLeft <= params.TRANSACTION_GAS) {
          // we ran out of space, so let's clear 
          priced.clear();
          break;
        }

        // update `priced` with the next best for this account:
        replaceFromHeap(priced, pendingFromOrigin, pending, origin);
      } else {
        // didn't fit. remove it from the priced transactions
        // without replacing it with another from the account.
        priced.removeBest();
      }
    }

    this.finalizeBlock(blockTransactions, transactionTrie, receiptTrie);
  }

  private async finalizeBlock(blockTransactions: Transaction[], transactionTrie: Trie, receiptTrie: Trie): Promise<Block> {
    // TODO: create the block and save it to the database
    return new Block(Buffer.from([0]), null);
  }
}