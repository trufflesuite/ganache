import Common from "ethereumjs-common";
import { BlockRawTx, EthereumRawTx, GanacheRawExtraTx } from "./raw";
import { FrozenTransaction } from "./frozen-transaction";

/**
 * A FrozenTransaction, whose _source_ is an existing Block
 */

export class BlockTransaction extends FrozenTransaction {
  constructor(
    data: BlockRawTx,
    blockHash: Buffer,
    blockNumber: Buffer,
    index: Buffer,
    common: Common
  ) {
    // Build a GanacheRawExtraTx from the data given to use by BlockRawTx and
    // the constructor args
    const extraRaw: GanacheRawExtraTx = data.slice(9) as any;
    extraRaw.push(blockHash);
    extraRaw.push(blockNumber);
    extraRaw.push(index);
    super([(data as any) as EthereumRawTx, extraRaw], common);
  }
}
