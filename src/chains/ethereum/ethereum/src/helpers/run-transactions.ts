import VM from "@ethereumjs/vm";
import { RuntimeBlock } from "@ganache/ethereum-block";
import { VmTransaction } from "@ganache/ethereum-transaction";

/**
 * Runs the given transactions, unchecked, through the VM with the given block.
 *
 * The method does not create a `checkpoint` or `commit`/`revert`.
 *
 * @param vm
 * @param transactions
 * @param block
 */
export async function runTransactions(
  vm: VM,
  transactions: VmTransaction[],
  block: RuntimeBlock
) {
  for (let i = 0, l = transactions.length; i < l; i++) {
    await vm
      .runTx({
        tx: transactions[i] as any,
        block: block as any
      })
      // we ignore transactions that error because we just want to _run_ these,
      // transactions just to update the blockchain's state
      .catch(() => {});
  }
}
