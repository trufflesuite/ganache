import type Common from "@ethereumjs/common";
import {
  GanacheRawBlockTransactionMetaData,
  GanacheRawExtraTx,
  TypedRawTransaction
} from "./raw";
import { FrozenTransaction } from "./frozen-transaction";

/**
 * A FrozenTransaction, whose _source_ is an existing Block
 */

export class BlockTransaction extends FrozenTransaction {
  constructor(
    data: TypedRawTransaction,
    [from, hash]: GanacheRawBlockTransactionMetaData,
    blockHash: Buffer,
    blockNumber: Buffer,
    index: Buffer,
    common: Common
  ) {
    // Build a GanacheRawExtraTx from the data given to use by BlockRawTx and
    // the constructor args
    const extraRaw: GanacheRawExtraTx = [
      from,
      hash,
      blockHash,
      blockNumber,
      index
    ];
    super([data, extraRaw], common);
  }
}
