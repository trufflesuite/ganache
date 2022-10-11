import { Data, Quantity } from "@ganache/utils";
import type Common from "@ethereumjs/common";
import { GanacheTrie } from "@ganache/ethereum-utils";
import { Block } from "./block";

export class PendingBlock extends Block {
  /**
   * Used to override the `stateRoot` value of the return value of the `toJSON`
   * function.
   */
  #toJSONStateRootOverride = Data.from("0x", 32);
  /**
   * Used to override the `hash` value of the return value of the `toJSON`
   * function.
   */
  #toJSONHashOverride = Quantity.Empty;
  /**
   * Used to store the trie that was used when mining the block.
   */
  public readonly trie: GanacheTrie;

  constructor(common: Common, trie: GanacheTrie) {
    super(null, common);
    this.trie = trie;
  }

  /**
   * Calls the `Block` class' `toJSON` function, then overwrites the `stateRoot`
   * and `hash` properties of the result with the pending block's `stateRoot`
   * and `hash`.
   * @param includeFullTransactions
   * @returns The pending block's data in JSON format.
   */
  toJSON<IncludeTransactions extends boolean>(
    includeFullTransactions: IncludeTransactions
  ) {
    const json = super.toJSON(includeFullTransactions);
    json.stateRoot = this.#toJSONStateRootOverride;
    json.hash = this.#toJSONHashOverride;

    return json;
  }

  static fromBlock(block: Block, common: Common, trie: GanacheTrie) {
    const pendingBlock = new PendingBlock(common, trie);
    const { rawHeader, txs, header, extraTxs, size } = block.getParts();
    pendingBlock._raw = rawHeader;
    pendingBlock._rawTransactions = txs;
    pendingBlock.header = header;
    pendingBlock._rawTransactionMetaData = extraTxs;
    pendingBlock._size = size;
    return pendingBlock;
  }
}
