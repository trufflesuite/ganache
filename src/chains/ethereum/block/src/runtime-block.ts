import {
  Data,
  Quantity,
  BUFFER_EMPTY,
  BUFFER_32_ZERO,
  BUFFER_8_ZERO
} from "@ganache/utils";
import { BN, KECCAK256_RLP_ARRAY } from "ethereumjs-util";
import { EthereumRawBlockHeader, serialize } from "./serialize";
import { Address } from "@ganache/ethereum-address";
import { Block } from "./block";
import {
  EthereumRawTx,
  GanacheRawBlockTransactionMetaData,
  RuntimeTransaction
} from "@ganache/ethereum-transaction";
import { StorageKeys } from "@ganache/ethereum-utils";

/**
 * BN, but with an extra `buf` property that caches the original Buffer value
 * we pass in.
 */
class BnExtra extends BN {
  public buf: Buffer;
  constructor(number: Buffer) {
    super(number, 10, "be");
    this.buf = number;
  }
}

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
};

/**
 * Returns the size of the serialized data as it would have been calculated had
 * we stored things geth does, i.e., `totalDfficulty` is not usually stored in
 * the block header.
 *
 * @param serialized
 * @param totalDifficulty
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
    totalDifficulty: Quantity.from(totalDifficulty, false)
  };
}

/**
 * A minimal block that can be used by the EVM to run transactions.
 */
export class RuntimeBlock {
  public readonly header: {
    parentHash: Buffer;
    difficulty: BnExtra;
    totalDifficulty: Buffer;
    coinbase: { buf: Buffer; toBuffer: () => Buffer };
    number: BnExtra;
    gasLimit: BnExtra;
    timestamp: BnExtra;
  };

  constructor(
    number: Quantity,
    parentHash: Data,
    coinbase: Address,
    gasLimit: Buffer,
    timestamp: Quantity,
    difficulty: Quantity,
    previousBlockTotalDifficulty: Quantity
  ) {
    const ts = timestamp.toBuffer();
    const coinbaseBuffer = coinbase.toBuffer();
    this.header = {
      parentHash: parentHash.toBuffer(),
      coinbase: { buf: coinbaseBuffer, toBuffer: () => coinbaseBuffer },
      number: new BnExtra(number.toBuffer()),
      difficulty: new BnExtra(difficulty.toBuffer()),
      totalDifficulty: Quantity.from(
        previousBlockTotalDifficulty.toBigInt() + difficulty.toBigInt()
      ).toBuffer(),
      gasLimit: new BnExtra(gasLimit),
      timestamp: new BnExtra(ts)
    };
  }

  /**
   * Returns the serialization of all block data, the hash of the block header,
   * and a map of the hashed and raw storage keys
   *
   * @param transactionsTrie
   * @param receiptTrie
   * @param bloom
   * @param stateRoot
   * @param gasUsed
   * @param extraData
   * @param transactions
   * @param storageKeys
   */
  finalize(
    transactionsTrie: Buffer,
    receiptTrie: Buffer,
    bloom: Buffer,
    stateRoot: Buffer,
    gasUsed: bigint,
    extraData: Data,
    transactions: RuntimeTransaction[],
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
      header.difficulty.buf,
      header.number.buf,
      header.gasLimit.buf,
      gasUsed === 0n ? BUFFER_EMPTY : Quantity.from(gasUsed).toBuffer(),
      header.timestamp.buf,
      extraData.toBuffer(),
      BUFFER_32_ZERO, // mixHash
      BUFFER_8_ZERO // nonce
    ];
    const { totalDifficulty } = header;
    const txs: EthereumRawTx[] = [];
    const extraTxs: GanacheRawBlockTransactionMetaData[] = [];
    transactions.forEach(tx => {
      txs.push(tx.raw);
      extraTxs.push([tx.from.toBuffer(), tx.hash.toBuffer()]);
    });
    const { serialized, size } = serialize([
      rawHeader,
      txs,
      [],
      totalDifficulty,
      extraTxs
    ]);

    // make a new block, but pass `null` so it doesn't do the extra
    // deserialization work since we already have everything in a deserialized
    // state here. We'll just set it ourselves by reaching into the "_private"
    // fields.
    const block = new Block(null, null);
    (block as any)._raw = rawHeader;
    (block as any)._rawTransactions = txs;
    (block as any).header = makeHeader(rawHeader, totalDifficulty);
    (block as any)._rawTransactionMetaData = extraTxs;
    (block as any)._size = size;

    return {
      block,
      serialized,
      storageKeys,
      transactions
    };
  }
}
