import { Data, Quantity } from "@ganache/utils";
import {
  GanacheRawBlockTransactionMetaData,
  GanacheRawExtraTx,
  TransactionFactory,
  TypedDatabaseTransaction,
  TypedRawTransaction,
  TypedTransaction,
  TypedTransactionJSON
} from "@ganache/ethereum-transaction";
import type { Common } from "@ethereumjs/common";
import { encode, decode } from "@ganache/rlp";
import { BlockHeader, makeHeader } from "./runtime-block";
import { keccak } from "@ganache/utils";
import {
  EthereumRawBlock,
  EthereumRawBlockHeader,
  GanacheRawBlock,
  GanacheRawBlockExtras,
  Head,
  serialize,
  WithdrawalRaw
} from "./serialize";
import { BlockParams } from "./block-params";

export type BaseFeeHeader = BlockHeader &
  Required<Pick<BlockHeader, "baseFeePerGas">>;

function convertBlockRawTx(
  raw: Buffer,
  common: Common,
  extra: GanacheRawExtraTx
) {
  let txData: TypedRawTransaction;
  let type: number;
  if (raw.length === 9) {
    // legacy txs
    type == 0;
    raw = raw;
  } else {
    // type 1 and 2 txs
    type = raw[0];
    raw = raw.subarray(1);
  }
  return TransactionFactory.fromTypeAndTxData(type, txData, common, extra);
}

export class Block {
  /**
   *  Base fee per gas for blocks without a parent containing a base fee per gas.
   */
  static readonly INITIAL_BASE_FEE_PER_GAS =
    BlockParams.INITIAL_BASE_FEE_PER_GAS;

  protected _size: number;
  protected _raw: EthereumRawBlockHeader;
  protected _common: Common;
  protected _rawTransactions: Buffer[];
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
   * Migrates a serialized Block to the latest version
   * @param serialized
   * @returns
   */
  static migrate(serialized: Buffer) {
    // this migration updates the `size` value of the block to the correct value
    // by re-serializing the block for storage in the db

    const deserialized = decode<GanacheRawBlock>(serialized);
    const { serialized: reSerialized } = serialize(
      deserialized.slice(0, 3) as Head<EthereumRawBlock>,
      deserialized.slice(3, 5) as Head<GanacheRawBlockExtras>
    );
    return reSerialized;
  }

  private _hash: Data;
  hash() {
    return (
      this._hash || (this._hash = Data.from(keccak(encode(this._raw)), 32))
    );
  }

  getTransactions() {
    const common = this._common;
    return this._rawTransactions.map((raw, index) => {
      const [from, hash] = this._rawTransactionMetaData[index];
      const extra: GanacheRawExtraTx = [
        from,
        hash,
        this.hash().toBuffer(),
        this.header.number.toBuffer(),
        Quantity.toBuffer(index)
      ];
      return convertBlockRawTx(raw, common, extra);
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
    const jsonTxs = this._rawTransactions.map((raw, index) => {
      const [from, hash] = this._rawTransactionMetaData[index];
      const extra: GanacheRawExtraTx = [
        from,
        hash,
        hashBuffer,
        number,
        Quantity.toBuffer(index)
      ];
      const tx = convertBlockRawTx(raw, common, extra);
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
      transactions: jsonTxs,
      uncles: [] as Data[], // this.value.uncleHeaders.map(function(uncleHash) {return to.hex(uncleHash)})
      withdrawals:
        this._rawWithdrawals?.map(
          ([index, validatorIndex, address, amount]) => {
            return {
              index: Quantity.from(index),
              validatorIndex: Quantity.from(validatorIndex),
              address: Data.from(address),
              amount: Quantity.from(amount)
            };
          }
        ) || undefined
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
