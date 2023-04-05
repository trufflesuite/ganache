import { Data, Quantity, BUFFER_EMPTY, BUFFER_8_ZERO } from "@ganache/utils";
import { KECCAK256_RLP_ARRAY } from "@ethereumjs/util";
import {
  EthereumRawBlock,
  EthereumRawBlockHeader,
  serialize
} from "./serialize";
import { Address } from "@ganache/ethereum-address";
import { Block } from "./block";
import {
  LegacyRawTransaction,
  GanacheRawBlockTransactionMetaData,
  TypedTransaction
} from "@ganache/ethereum-transaction";
import { StorageKeys } from "@ganache/ethereum-utils";
import { Common } from "@ethereumjs/common";

export type Withdrawal = {
  index: Quantity;
  validatorIndex: Quantity;
  address: Data;
  amount: Quantity;
};

export type BlockHeader = {
  parentHash: Data;
  sha3Uncles: Data;
  miner: Data;
  stateRoot: Data;
  transactionsRoot: Data;
  receiptsRoot: Data;
  logsBloom: Data;
  difficulty: Quantity;
  totalDifficulty: Quantity;
  number: Quantity;
  gasLimit: Quantity;
  gasUsed: Quantity;
  timestamp: Quantity;
  extraData: Data;
  mixHash: Data;
  nonce: Data;
  baseFeePerGas?: Quantity;
  withdrawalsRoot?: Data;
};

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

export function makeHeader(
  raw: EthereumRawBlockHeader,
  totalDifficulty: Buffer
): BlockHeader {
  return {
    parentHash: Data.from(raw[0], 32),
    sha3Uncles: Data.from(raw[1], 32),
    miner: Data.from(raw[2], 20),
    stateRoot: Data.from(raw[3], 32),
    transactionsRoot: Data.from(raw[4], 32),
    receiptsRoot: Data.from(raw[5], 32),
    logsBloom: Data.from(raw[6], 256),
    difficulty: Quantity.from(raw[7], false),
    number: Quantity.from(raw[8], false),
    gasLimit: Quantity.from(raw[9], false),
    gasUsed: Quantity.from(raw[10], false),
    timestamp: Quantity.from(raw[11], false),
    extraData: Data.from(raw[12]),
    mixHash: Data.from(raw[13], 32),
    nonce: Data.from(raw[14], 8),
    totalDifficulty: Quantity.from(totalDifficulty, false),
    baseFeePerGas:
      raw[15] === undefined ? undefined : Quantity.from(raw[15], false),
    withdrawalsRoot: raw[16] === undefined ? undefined : Data.from(raw[16], 32)
  };
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
    baseFeePerGas?: bigint;
    withdrawalsRoot?: Buffer; // added in shanghai
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
    const coinbaseBuffer = coinbase.toBuffer();
    this.header = {
      parentHash: parentHash.toBuffer(),
      coinbase: new Address(coinbaseBuffer),
      number: number.toBigInt(),
      difficulty: difficulty.toBigInt(),
      totalDifficulty: Quantity.toBuffer(
        previousBlockTotalDifficulty.toBigInt() + difficulty.toBigInt()
      ),
      gasLimit: gasLimit.toBigInt(),
      gasUsed: gasUsed.toBigInt(),
      timestamp: timestamp.toBigInt(),
      baseFeePerGas: baseFeePerGas ?? undefined,
      mixHash,
      prevRandao: mixHash,
      withdrawalsRoot
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
    const txs: (LegacyRawTransaction | Buffer)[] = Array(transactions.length);
    const extraTxs: GanacheRawBlockTransactionMetaData[] = Array(
      transactions.length
    );
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      txs[i] = tx.raw.length === 9 ? tx.raw : tx.serialized;
      extraTxs[i] = [tx.from.toBuffer(), tx.hash.toBuffer()];
    }
    let rawBlock: EthereumRawBlock;
    rawBlock = isEip4895 ? [rawHeader, txs, [], []] : [rawHeader, txs, []];
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
