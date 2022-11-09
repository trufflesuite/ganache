import { TypedTransaction } from "@ganache/ethereum-transaction";
import { Heap } from "@ganache/utils";
import { byNonce } from "../transaction-pool";

export class ExecutableTransactionContainer {
  public inProgress: Set<TypedTransaction> = new Set();
  public pendingByOrigin: Map<string, Heap<TypedTransaction>> = new Map();

  /**
   * Deep clones the executables and all transactions within the executables,
   * moving all `inProgress` transactions to the `pendingByOrigin` queue and
   * unlocking all transactions.
   * @returns Cloned and reset executables.
   */
  public cloneAndReset() {
    const executables = new ExecutableTransactionContainer();
    const { inProgress, pendingByOrigin: pending } = this;

    inProgress.forEach(transaction => {
      const copy = transaction.clone();
      copy.locked = false;
      const origin = copy.from.toString();
      const txsFromOrigin = executables.pendingByOrigin.get(origin);
      if (txsFromOrigin) {
        txsFromOrigin.push(copy);
      } else {
        executables.pendingByOrigin.set(origin, Heap.from(copy, byNonce));
      }
    });

    pending.forEach((transactionHeap, from) => {
      const { array: transactions, length } = transactionHeap;
      let newOrigin = executables.pendingByOrigin.get(from);
      if (!newOrigin) {
        newOrigin = new Heap(byNonce);
        executables.pendingByOrigin.set(from, newOrigin);
      }
      for (let i = 0; i < length; i++) {
        const copy = transactions[i].clone();
        copy.locked = false;
        newOrigin.push(copy);
      }
    });

    return executables;
  }
}
