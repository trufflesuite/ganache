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
   * Optional field to store the trie that was used when mining the block.
   */
  #trie: GanacheTrie;

  constructor(serialized: Buffer, common: Common, trie: GanacheTrie) {
    super(serialized, common);
    this.#trie = trie;
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
  /**
   * @returns The trie at the time the pending block was made.
   */
  getTrie(): GanacheTrie {
    return this.#trie;
  }
}
