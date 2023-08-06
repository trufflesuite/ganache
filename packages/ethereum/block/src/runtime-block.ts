import { Data, Quantity, BUFFER_EMPTY, BUFFER_8_ZERO } from "@ganache/utils";
import { KECCAK256_RLP_ARRAY } from "@ethereumjs/util";
import {
  BlockRawTransaction,
  EthereumRawBlock,
  EthereumRawBlockHeader,
  serialize
} from "./serialize";
import { Address } from "@ganache/ethereum-address";
import {
  encodeWithPrefix,
  GanacheRawBlockTransactionMetaData,
  TypedTransaction
} from "@ganache/ethereum-transaction";
import { StorageKeys } from "@ganache/ethereum-utils";
import { Common } from "@ethereumjs/common";
import { makeHeader } from "./helpers";
import { Block } from "./block";
import { format } from "path";

/**
 * Returns the size of the serialized data as it would have been calculated had
 * we stored things geth does, i.e., `totalDifficulty` is not usually stored in
 * the block header.
 *
 * @param serialized -
 * @param totalDifficulty -
 */
export function getBlockSize(serialized: Buffer, totalDifficulty: Buffer) {
  return serialized.length - totalDifficulty.length;
}

/**
 * A minimal block that can be used by the EVM to run transactions.
 */
export class RuntimeBlock {
  private readonly _common: Common;
  public readonly header: {
    parentHash: Buffer;
    difficulty: bigint;
    totalDifficulty: Buffer;
    coinbase: Address;
    number: bigint;
    gasLimit: bigint;
    gasUsed: bigint;
    timestamp: bigint;
    mixHash: Buffer;
    // prevRandao is mixHash, but for the merge and it must be
    // given to the VM this way
    prevRandao: Buffer;
    baseFeePerGas?: bigint; // added in london
    withdrawalsRoot?: Buffer; // added in shanghai
    cliqueSigner: () => Address;
  };

  constructor(
    common: Common,
    number: Quantity,
    parentHash: Data,
    coinbase: Address,
    gasLimit: Quantity,
    gasUsed: Quantity,
    timestamp: Quantity,
    difficulty: Quantity,
    previousBlockTotalDifficulty: Quantity,
    mixHash: Buffer,
    baseFeePerGas?: bigint,
    withdrawalsRoot?: Buffer
  ) {
    this._common = common;
    this.header = {
      parentHash: parentHash.toBuffer(),
      coinbase: coinbase,
      number: number.toBigInt(),
      difficulty: difficulty.toBigInt(),
      totalDifficulty: Quantity.toBuffer(
        previousBlockTotalDifficulty.toBigInt() + difficulty.toBigInt()
      ),
      gasLimit: gasLimit.toBigInt(),
      gasUsed: gasUsed.toBigInt(),
      timestamp: timestamp.toBigInt(),
      baseFeePerGas,
      mixHash,
      prevRandao: mixHash,
      withdrawalsRoot,
      // fixes https://github.com/trufflesuite/ganache/issues/4359
      cliqueSigner: () => coinbase
    };
  }

  /**
   * Returns the serialization of all block data, the hash of the block header,
   * and a map of the hashed and raw storage keys
   */
  finalize(
    transactionsTrie: Buffer,
    receiptTrie: Buffer,
    bloom: Buffer,
    stateRoot: Buffer,
    gasUsed: bigint,
    extraData: Data,
    transactions: TypedTransaction[],
    storageKeys: StorageKeys
  ) {
    const { header } = this;
    const rawHeader: EthereumRawBlockHeader = [
      header.parentHash,
      KECCAK256_RLP_ARRAY, // uncleHash
      header.coinbase.buf,
      stateRoot,
      transactionsTrie,
      receiptTrie,
      bloom,
      Quantity.toBuffer(header.difficulty),
      Quantity.toBuffer(header.number),
      Quantity.toBuffer(header.gasLimit),
      gasUsed === 0n ? BUFFER_EMPTY : Quantity.toBuffer(gasUsed),
      Quantity.toBuffer(header.timestamp),
      extraData.toBuffer(),
      header.mixHash,
      BUFFER_8_ZERO // nonce
    ];
    const isEip4895 = this._common.isActivatedEIP(4895);
    // baseFeePerGas was added in London
    if (header.baseFeePerGas !== undefined) {
      rawHeader[15] = Quantity.toBuffer(header.baseFeePerGas, false);
      // withdrawalsRoot was added in Shanghai
      if (isEip4895) rawHeader[16] = Data.toBuffer(header.withdrawalsRoot);
    }

    const { totalDifficulty } = header;
    const txs: BlockRawTransaction[] = Array(transactions.length);
    const extraTxs: GanacheRawBlockTransactionMetaData[] = Array(
      transactions.length
    );
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      txs[i] =
        tx.raw.length === 9
          ? tx.raw // legacy transactions don't have their own encoding
          : tx.serialized ?? encodeWithPrefix(tx.type.toNumber(), tx.raw);
      extraTxs[i] = [tx.from.toBuffer(), tx.hash.toBuffer()];
    }
    const rawBlock: EthereumRawBlock = isEip4895
      ? [rawHeader, txs, [], []]
      : [rawHeader, txs, []];
    const { serialized, size } = serialize(rawBlock, [
      totalDifficulty,
      extraTxs
    ]);

    // make a new block, but pass `null` so it doesn't do the extra
    // deserialization work since we already have everything in a deserialized
    // state here. We'll just set it ourselves by reaching into the "_private"
    // fields.
    const block: any = new Block(null, this._common);
    block._raw = rawHeader;
    block._rawTransactions = txs;
    block.header = makeHeader(rawHeader, totalDifficulty);
    block._rawWithdrawals = [];
    block._rawTransactionMetaData = extraTxs;
    block._size = size;

    return {
      block: block as Block,
      serialized,
      storageKeys,
      transactions
    };
  }
}
