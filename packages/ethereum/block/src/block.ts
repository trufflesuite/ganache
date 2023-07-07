import { Data, Quantity } from "@ganache/utils";
import {
  encodeWithPrefix,
  GanacheRawBlockTransactionMetaData,
  GanacheRawExtraTx,
  TypedTransaction,
  TypedTransactionJSON
} from "@ganache/ethereum-transaction";
import type { Common } from "@ethereumjs/common";
import { encode, decode } from "@ganache/rlp";
import { BlockHeader, makeHeader } from "./helpers";
import { keccak } from "@ganache/utils";
import {
  BlockRawTransaction,
  blockTransactionFromRaw,
  convertRawWithdrawals,
  EthereumRawBlock,
  EthereumRawBlockHeader,
  GanacheRawBlock,
  GanacheRawBlockExtras,
  Head,
  serialize,
  WithdrawalRaw
} from "./serialize";
import { BlockParams } from "./block-params";

export type { BlockHeader } from "./helpers";

export type BaseFeeHeader = BlockHeader &
  Required<Pick<BlockHeader, "baseFeePerGas">>;

export class Block {
  /**
   *  Base fee per gas for blocks without a parent containing a base fee per gas.
   */
  static readonly INITIAL_BASE_FEE_PER_GAS =
    BlockParams.INITIAL_BASE_FEE_PER_GAS;

  protected _size: number;
  protected _raw: EthereumRawBlockHeader;
  protected _common: Common;
  protected _rawTransactions: BlockRawTransaction[];
  protected _rawTransactionMetaData: GanacheRawBlockTransactionMetaData[];
  protected _rawWithdrawals: WithdrawalRaw[] | null;

  public header: BlockHeader;

  constructor(serialized: Buffer, common: Common) {
    this._common = common;
    if (serialized) {
      const deserialized = decode<GanacheRawBlock>(serialized);
      this._raw = deserialized[0];
      this._rawTransactions = deserialized[1] || [];
      // TODO: support actual uncle data (needed for forking!)
      // Issue: https://github.com/trufflesuite/ganache/issues/786
      // const uncles = deserialized[2];

      let totalDifficulty: Buffer;
      // if there are 7 serialized fields we are after shanghai
      // as in shanghai we added `withdrawals` to the block data
      if (deserialized.length === 7) {
        this._rawWithdrawals = deserialized[3] || []; // added in Shanghai
        totalDifficulty = deserialized[4];
        this._rawTransactionMetaData = deserialized[5] || [];
        this._size = Quantity.toNumber(deserialized[6]);
      } else {
        this._rawWithdrawals = null;
        totalDifficulty = deserialized[3] as any;
        this._rawTransactionMetaData = (deserialized[4] || []) as any;
        this._size = Quantity.toNumber(deserialized[5] as any);
      }
      this.header = makeHeader(this._raw, totalDifficulty);
    }
  }

  /**
   * Migrates a serialized Block to the latest version. This should only be
   * called on serialized data from blocks created before v7.8.0.
   *
   * This migration updates the `size` value of the block to the correct value
   * by re-serializing the block for storage in the db.
   * @param serialized
   * @returns
   */
  static migrate(serialized: Buffer) {
    const deserialized = decode<GanacheRawBlock>(serialized);
    const start = deserialized.slice(0, 3) as EthereumRawBlock;
    start[1] = start[1].map((oldRawTx: any) => {
      if (oldRawTx.length === 9) {
        return oldRawTx; // legacy transactions are fine
      } else {
        // `type` is always `< 0x7F`, so we can yank the first byte from the
        // Buffer without having to think about conversion.
        // https://eips.ethereum.org/EIPS/eip-2718#transactiontype-only-goes-up-to-0x7f
        const type = oldRawTx[0][0];
        const raw = oldRawTx.slice(1);
        // type 1 and 2 transactions were encoded within the block as:
        // `[type, ...rawTx]` when they should have been `[type, encode(rawTx)]`
        return encodeWithPrefix(type, raw);
      }
    });
    return serialize(
      start,
      deserialized.slice(3, 5) as Head<GanacheRawBlockExtras>
    ).serialized;
  }

  private _hash: Data;
  hash() {
    return (
      this._hash || (this._hash = Data.from(keccak(encode(this._raw)), 32))
    );
  }

  getTransactions() {
    const common = this._common;
    const blockHash = this.hash().toBuffer();
    const number = this.header.number.toBuffer();
    return this._rawTransactions.map((raw, index) => {
      const [from, hash] = this._rawTransactionMetaData[index];
      const extra: GanacheRawExtraTx = [
        from,
        hash,
        blockHash,
        number,
        Quantity.toBuffer(index)
      ];
      return blockTransactionFromRaw(raw, common, extra);
    });
  }

  toJSON<IncludeTransactions extends boolean>(
    includeFullTransactions: IncludeTransactions
  ) {
    const hash = this.hash();
    const txFn = this.getTxFn<IncludeTransactions>(includeFullTransactions);
    const hashBuffer = hash.toBuffer();
    const header = this.header;
    const number = header.number.toBuffer();
    const common = this._common;
    const transactions = this._rawTransactions.map((raw, index) => {
      const [from, hash] = this._rawTransactionMetaData[index];
      const extra: GanacheRawExtraTx = [
        from,
        hash,
        hashBuffer,
        number,
        Quantity.toBuffer(index)
      ];
      const tx = blockTransactionFromRaw(raw, common, extra);
      // we could either parse the raw data to check if the tx is type 2,
      // get the maxFeePerGas and maxPriorityFeePerGas, use those to calculate
      // the effectiveGasPrice and add it to `extra` above, or we can just
      // leave it out of extra and update the effectiveGasPrice after like this
      tx.updateEffectiveGasPrice(header.baseFeePerGas?.toBigInt());
      return txFn(tx);
    }) as IncludeTransactions extends true ? TypedTransactionJSON[] : Data[];

    return {
      hash,
      ...header,
      size: Quantity.from(this._size),
      transactions,
      uncles: [] as Data[], // this.value.uncleHeaders.map(function(uncleHash) {return to.hex(uncleHash)})
      // if `this._rawWithdrawals` is not set we should not include it in the
      // JSON response (`undefined` gets stripped when JSON.stringify is called).
      withdrawals: this._rawWithdrawals?.map(convertRawWithdrawals)
    };
  }

  getTxFn<IncludeTransactions extends boolean>(
    include: IncludeTransactions = <IncludeTransactions>false
  ): (tx: TypedTransaction) => ReturnType<TypedTransaction["toJSON"]> | Data {
    if (include) {
      return (tx: TypedTransaction) => tx.toJSON(this._common);
    } else {
      return (tx: TypedTransaction) => tx.hash;
    }
  }

  static calcNextBaseFeeBigInt(parentHeader: BaseFeeHeader) {
    let nextBaseFee: bigint;

    const header = parentHeader;
    const parentGasTarget = header.gasLimit.toBigInt() / BlockParams.ELASTICITY;
    const parentGasUsed = header.gasUsed.toBigInt();
    const baseFeePerGas = header.baseFeePerGas
      ? header.baseFeePerGas.toBigInt()
      : BlockParams.INITIAL_BASE_FEE_PER_GAS;

    if (parentGasTarget === parentGasUsed) {
      // If the parent gasUsed is the same as the target, the baseFee remains unchanged.
      nextBaseFee = baseFeePerGas;
    } else if (parentGasUsed > parentGasTarget) {
      // If the parent block used more gas than its target, the baseFee should increase.
      const gasUsedDelta = parentGasUsed - parentGasTarget;
      const adjustedFeeDelta =
        (baseFeePerGas * gasUsedDelta) /
        parentGasTarget /
        BlockParams.BASE_FEE_MAX_CHANGE_DENOMINATOR;
      if (adjustedFeeDelta > 1n) {
        nextBaseFee = baseFeePerGas + adjustedFeeDelta;
      } else {
        nextBaseFee = baseFeePerGas + 1n;
      }
    } else {
      // Otherwise if the parent block used less gas than its target, the baseFee should decrease.
      const gasUsedDelta = parentGasTarget - parentGasUsed;
      const adjustedFeeDelta =
        (baseFeePerGas * gasUsedDelta) /
        parentGasTarget /
        BlockParams.BASE_FEE_MAX_CHANGE_DENOMINATOR;
      nextBaseFee = baseFeePerGas - adjustedFeeDelta;
    }

    return nextBaseFee;
  }

  static calcNBlocksMaxBaseFee(blocks: number, parentHeader: BaseFeeHeader) {
    const { BASE_FEE_MAX_CHANGE_DENOMINATOR } = BlockParams;

    let maxPossibleBaseFee = this.calcNextBaseFeeBigInt(parentHeader);

    // we must calculate each future block's max base fee individually because
    // each block's base fee must be appropriately "floored" (Math.floor) before
    // the following block's base fee is calculated. If we don't do this we'll
    // end up with compounding rounding errors.
    // FYI: the more performant, but rounding error-prone, way is:
    // return lastMaxBlockBaseFee + (lastMaxBlockBaseFee * ((BASE_FEE_MAX_CHANGE_DENOMINATOR-1)**(blocks-1)) / ((BASE_FEE_MAX_CHANGE_DENOMINATOR)**(blocks-1)))
    while (--blocks) {
      maxPossibleBaseFee +=
        maxPossibleBaseFee / BASE_FEE_MAX_CHANGE_DENOMINATOR;
    }
    return maxPossibleBaseFee;
  }

  static calcNextBaseFee(parentBlock: Block) {
    const header = parentBlock.header;
    if (header.baseFeePerGas === undefined) {
      return undefined;
    } else {
      return this.calcNextBaseFeeBigInt(<BaseFeeHeader>header);
    }
  }
}
