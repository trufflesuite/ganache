import {
  Data,
  Quantity,
  BUFFER_EMPTY,
  BUFFER_32_ZERO,
  BUFFER_8_ZERO,
  BUFFER_ZERO
} from "@ganache/utils";
import { BN, KECCAK256_RLP_ARRAY } from "ethereumjs-util";
import { EthereumRawBlockHeader, serialize } from "./serialize";
import { Address } from "@ganache/ethereum-address";
import { Block } from "./block";
import {
  TypedDatabaseTransaction,
  GanacheRawBlockTransactionMetaData,
  TypedTransaction
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
  baseFeePerGas?: Quantity;
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
      raw[15] === undefined ? undefined : Quantity.from(raw[15], false)
  };
}

/**
 * A minimal block that can be used by the EVM to run transactions.
 */
export class RuntimeBlock {
  private serializeBaseFeePerGas: boolean = true;
  public readonly header: {
    parentHash: Buffer;
    difficulty: BnExtra;
    totalDifficulty: Buffer;
    coinbase: { buf: Buffer; toBuffer: () => Buffer };
    number: BnExtra;
    gasLimit: BnExtra;
    gasUsed: BnExtra;
    timestamp: BnExtra;
    baseFeePerGas?: BnExtra;
  };

  constructor(
    number: Quantity,
    parentHash: Data,
    coinbase: Address,
    gasLimit: Buffer,
    gasUsed: Buffer,
    timestamp: Quantity,
    difficulty: Quantity,
    previousBlockTotalDifficulty: Quantity,
    baseFeePerGas?: bigint
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
      gasUsed: new BnExtra(gasUsed),
      timestamp: new BnExtra(ts),
      baseFeePerGas:
        baseFeePerGas === undefined
          ? new BnExtra(BUFFER_ZERO)
          : new BnExtra(Quantity.toBuffer(baseFeePerGas))
    };
    // When forking we might get a block that doesn't have a baseFeePerGas value,
    // but EIP-1559 might be active on our chain. We need to keep track on if
    // we should serialize the baseFeePerGas value or not based on that info.
    // this will be removed as part of https://github.com/trufflesuite/ganache/pull/1537
    if (baseFeePerGas === undefined) this.serializeBaseFeePerGas = false;
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
      header.difficulty.buf,
      header.number.buf,
      header.gasLimit.buf,
      gasUsed === 0n ? BUFFER_EMPTY : Quantity.toBuffer(gasUsed),
      header.timestamp.buf,
      extraData.toBuffer(),
      BUFFER_32_ZERO, // mixHash
      BUFFER_8_ZERO // nonce
    ];
    if (this.serializeBaseFeePerGas && header.baseFeePerGas !== undefined) {
      rawHeader[15] = header.baseFeePerGas.buf;
    }

    const { totalDifficulty } = header;
    const txs: TypedDatabaseTransaction[] = [];
    const extraTxs: GanacheRawBlockTransactionMetaData[] = [];
    transactions.forEach(tx => {
      txs.push(<TypedDatabaseTransaction>tx.raw);
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
    const block = new Block(
      null,
      // TODO(hack)!
      transactions.length > 0 ? transactions[0].common : null
    );
    (block as any)._raw = rawHeader;
    (block as any)._rawTransactions = txs;
    (block as any).header = makeHeader(rawHeader, totalDifficulty);
    (block as any).serializeBaseFeePerGas = rawHeader[15] === undefined;
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
