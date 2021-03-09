import { Data, Quantity } from "@ganache/utils";
import { utils } from "@ganache/utils";
import Common from "ethereumjs-common";
import keccak from "keccak";
import { encode as rlpEncode, decode as rlpDecode } from "rlp";
import { BlockRawTx, EthereumRawTx } from "./transaction/raw";
import { BlockTransaction } from "./transaction";
import { RuntimeTransaction } from "./transaction";
import { Address } from "./address";
import { KECCAK256_RLP_ARRAY } from "ethereumjs-util";
import { StorageKeys } from "../types/debug-storage";

const { BUFFER_EMPTY, BUFFER_32_ZERO, BUFFER_8_ZERO } = utils;

type BlockHeader = {
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
function getBlockSize(serialized: Buffer, totalDifficulty: Buffer) {
  return serialized.length - totalDifficulty.length;
}

function makeHeader(raw: Buffer[], totalDifficulty: Buffer) {
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

export class Block {
  private readonly _size: number;
  private readonly _raw: Buffer[];
  private readonly _common: Common;
  private _transactions: BlockTransaction[] = null;
  private readonly _rawTransactions: BlockRawTx[] = null;

  public readonly header: BlockHeader;

  constructor(serialized: Buffer, common: Common) {
    this._common = common;
    if (serialized) {
      const deserialized = (rlpDecode(serialized) as any) as [
        Buffer[],
        BlockRawTx[],
        Buffer[],
        Buffer
      ];
      this._raw = deserialized[0];
      this._rawTransactions = deserialized[1];
      // TODO: support actual uncle data (needed for forking!)
      // Issue: https://github.com/trufflesuite/ganache-core/issues/786
      // const uncles = deserialized[1];
      const totalDifficulty = deserialized[3];
      this.header = makeHeader(this._raw, totalDifficulty);
      this._size = getBlockSize(serialized, totalDifficulty);
    }
  }

  private _hash: Data;
  hash() {
    return (
      this._hash ||
      (this._hash = Data.from(
        keccak("keccak256").update(rlpEncode(this._raw)).digest(),
        32
      ))
    );
  }

  getTransactions() {
    if (this._transactions) {
      return this._transactions;
    }
    const common = this._common;
    return (this._transactions = this._rawTransactions.map(
      (raw, index) =>
        new BlockTransaction(
          raw,
          this.hash().toBuffer(),
          this.header.number.toBuffer(),
          Quantity.from(index).toBuffer(),
          common
        )
    ));
  }

  toJSON(includeFullTransactions = false) {
    const hash = this.hash();
    const txFn = this.getTxFn(includeFullTransactions);
    let jsonTxs: Data[] | {}[];

    let transactions = this._transactions;
    if (transactions) {
      jsonTxs = transactions.map(txFn);
    } else {
      const number = this.header.number;
      const common = this._common;
      transactions = this._transactions = [];
      jsonTxs = this._rawTransactions.map((raw, index) => {
        const tx = new BlockTransaction(
          raw,
          hash.toBuffer(),
          number.toBuffer(),
          Quantity.from(index).toBuffer(),
          common
        );
        transactions.push(tx);
        return txFn(tx);
      });
    }

    return {
      hash,
      ...this.header,
      size: Quantity.from(this._size),
      transactions: jsonTxs,
      uncles: [] as string[] // this.value.uncleHeaders.map(function(uncleHash) {return to.hex(uncleHash)})
    };
  }

  // static fromJSON(json: any, common: Common, asSerialized: boolean = true) {
  //   const rawHeader = [
  //     Data.from(json.parentHash, 32).toBuffer(),
  //     Data.from(json.sha3Uncles, 32).toBuffer(),
  //     Data.from(json.miner, 20).toBuffer(),
  //     Data.from(json.stateRoot, 32).toBuffer(),
  //     Data.from(json.transactionsRoot, 32).toBuffer(), // ???
  //     Data.from(json.receiptsRoot, 32).toBuffer(),
  //     Data.from(json.logsBloom, 256).toBuffer(),
  //     Quantity.from(json.difficulty, false).toBuffer(),
  //     Quantity.from(json.totalDifficulty, false).toBuffer(),
  //     Quantity.from(json.number, false).toBuffer(),
  //     Quantity.from(json.gasLimit, false).toBuffer(),
  //     Quantity.from(json.gasUsed, false).toBuffer(),
  //     Quantity.from(json.timestamp, false).toBuffer(),
  //     Data.from(json.extraData).toBuffer(),
  //     Data.from(json.mixHash, 32).toBuffer(), // mixHash
  //     Data.from(json.nonce, 8).toBuffer() // nonce
  //   ];
  //   const transactions = json.transactions.map(
  //     jsonTx => Transaction.jsonToRaw(jsonTx)
  //   );
  //   const serialized = rlpEncode([rawHeader, transactions]);
  //   return asSerialized ? serialized : new Block(serialized, common);
  // }

  getTxFn(
    include = false
  ): (
    tx: BlockTransaction
  ) => { [key: string]: string | Data | Quantity } | Data {
    if (include) {
      return (tx: BlockTransaction) => tx.toJSON();
    } else {
      return (tx: BlockTransaction) => tx.hash;
    }
  }
}

/**
 * A minimal block that can be used by the EVM to run transactions.
 */
export class RuntimeBlock {
  public readonly header: {
    parentHash: Buffer;
    difficulty: Buffer;
    totalDifficulty: Buffer;
    coinbase: Buffer;
    number: Buffer;
    gasLimit: Buffer;
    timestamp: Buffer;
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
    this.header = {
      parentHash: parentHash.toBuffer(),
      coinbase: coinbase.toBuffer(),
      number: number.toBuffer(),
      difficulty: difficulty.toBuffer(),
      totalDifficulty: Quantity.from(
        previousBlockTotalDifficulty.toBigInt() + difficulty.toBigInt()
      ).toBuffer(),
      gasLimit: gasLimit.length === 0 ? BUFFER_EMPTY : gasLimit,
      timestamp: ts.length === 0 ? BUFFER_EMPTY : ts
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
    const rawHeader = [
      header.parentHash,
      KECCAK256_RLP_ARRAY, // uncleHash
      header.coinbase,
      stateRoot,
      transactionsTrie,
      receiptTrie,
      bloom,
      header.difficulty,
      header.number,
      header.gasLimit,
      gasUsed === 0n ? BUFFER_EMPTY : Quantity.from(gasUsed).toBuffer(),
      header.timestamp,
      extraData.toBuffer(),
      BUFFER_32_ZERO, // mixHash
      BUFFER_8_ZERO // nonce
    ];
    // TODO: support actual uncle data (needed for forking!)
    // Issue: https://github.com/trufflesuite/ganache-core/issues/786
    const uncles = [];
    const { totalDifficulty } = header;
    const rawTransactions: BlockRawTx[] = transactions.map(tx => [
      ...tx.raw,
      tx.from.toBuffer(),
      tx.hash.toBuffer()
    ]);
    const raw = [rawHeader, rawTransactions, uncles, totalDifficulty];

    const serialized = rlpEncode(raw);

    // make a new block, but pass `null` so it doesn't do the extra
    // deserialization work since we already have everything in a deserialized
    // state here. We'll just set it ourselves by reaching into the "_private"
    // fields.
    const block = new Block(null, null);
    (block as any)._size = getBlockSize(serialized, totalDifficulty);
    (block as any)._raw = rawHeader;
    (block as any)._rawTransactions = rawTransactions;
    (block as any).header = makeHeader(rawHeader, totalDifficulty);

    return {
      block,
      serialized,
      storageKeys,
      transactions
    };
  }
}
