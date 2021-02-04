import { Data, Quantity } from "@ganache/utils";
import { utils } from "@ganache/utils";
import Common from "ethereumjs-common";
import keccak from "keccak";
import { encode as rlpEncode, decode as rlpDecode } from "rlp";
import { Transaction } from "./transaction";
import { Address } from "./address";
import { KECCAK256_RLP_ARRAY } from "ethereumjs-util";

const { BUFFER_EMPTY, RPCQUANTITY_ZERO } = utils;

type BlockHeader = {
  parentHash: Data;
  sha3Uncles: Data;
  miner: Data;
  stateRoot: Data;
  transactionsRoot: Data;
  receiptsRoot: Data;
  logsBloom: Data;
  difficulty: Quantity;
  number: Quantity;
  gasLimit: Quantity;
  gasUsed: Quantity;
  timestamp: Quantity;
  extraData: Data;
  mixHash: Data;
  nonce: Data;
};

function makeHeader(raw: Buffer[]) {
  const number = raw[8];

  return {
    parentHash: Data.from(raw[0], 32),
    sha3Uncles: Data.from(raw[1], 32),
    miner: Data.from(raw[2], 20),
    stateRoot: Data.from(raw[3], 32),
    transactionsRoot: Data.from(raw[4], 32),
    receiptsRoot: Data.from(raw[5], 32),
    logsBloom: Data.from(raw[6], 256),
    difficulty: Quantity.from(raw[7], false),
    // HACK: because `number` here is used as a key for the db we need to ensure
    // that the value here holds an actual `0` when the raw === Buffer([])
    // the other empty buffer values aren't ever used as keys, so leaving them
    // empty will probably be okay.
    number: Quantity.from(raw[8], false),
    gasLimit: Quantity.from(raw[9], false),
    gasUsed: Quantity.from(raw[10], false),
    timestamp: Quantity.from(raw[11], false),
    extraData: Data.from(raw[12]),
    mixHash: Data.from(raw[13], 32),
    nonce: Data.from(raw[14], 8)
  };
}

export class Block {
  private readonly _size: number;
  private readonly _raw: Buffer[];
  private readonly _common: Common;
  private _transactions: Transaction[] = null;
  private readonly _rawTransactions: Buffer[][] = null;

  public readonly header: BlockHeader;

  constructor(serialized: Buffer, common: Common) {
    if (serialized) {
      this._common = common;
      this._size = serialized.length;
      const deserialized = (rlpDecode(serialized) as any) as [
        Buffer[],
        Buffer[][]
      ];
      const raw = (this._raw = deserialized[0]);
      this._rawTransactions = deserialized[1];
      this.header = makeHeader(raw);
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
      raw => new Transaction(raw, common)
    ));
  }

  toJSON(includeFullTransactions = false) {
    const txFn = this.getTxFn(includeFullTransactions);
    let jsonTxs: Data[] | {}[];

    let transactions = this._transactions;
    if (transactions) {
      jsonTxs = transactions.map(txFn);
    } else {
      const common = this._common;
      transactions = this._transactions = [];
      jsonTxs = this._rawTransactions.map(raw => {
        const tx = new Transaction(raw, common);
        transactions.push(tx);
        return txFn(tx);
      });
    }

    return {
      hash: this.hash(),
      ...this.header,

      // TODO(forking): since ganache's difficulty is always 0, `totalDifficulty` for new blocks
      // should just be the forked block's `difficulty`. See https://ethereum.stackexchange.com/a/7102/44640
      totalDifficulty: RPCQUANTITY_ZERO,
      size: Quantity.from(this._size),
      transactions: jsonTxs,
      uncles: [] as string[] // this.value.uncleHeaders.map(function(uncleHash) {return to.hex(uncleHash)})
    };
  }

  getTxFn(
    include = false
  ): (tx: Transaction) => { [key: string]: string | Data | Quantity } | Data {
    if (include) {
      return (tx: Transaction) => tx.toJSON(this as any);
    } else {
      return (tx: Transaction) => Data.from(tx.hash());
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
    difficulty: Quantity
  ) {
    const ts = timestamp.toBuffer();
    this.header = {
      parentHash: parentHash.toBuffer(),
      coinbase: coinbase.toBuffer(),
      number: number.toBuffer(),
      difficulty: difficulty.toBuffer(),
      gasLimit: gasLimit.length === 0 ? BUFFER_EMPTY : gasLimit,
      timestamp: ts.length === 0 ? BUFFER_EMPTY : ts
    };
  }

  /**
   * Returns the serialization of all block data and returns the hash of the
   * block header.
   *
   * @param transactionsTrie
   * @param receiptTrie
   * @param bloom
   * @param stateRoot
   * @param gasUsed
   * @param extraData
   * @param transactions
   */
  finalize(
    transactionsTrie: Buffer,
    receiptTrie: Buffer,
    bloom: Buffer,
    stateRoot: Buffer,
    gasUsed: Buffer,
    extraData: Data,
    transactions: Transaction[]
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
      gasUsed,
      header.timestamp,
      extraData.toBuffer(),
      Buffer.allocUnsafe(32).fill(0), // mixHash
      Buffer.allocUnsafe(8).fill(0) // nonce
    ];
    const rawTransactions = transactions.map(tx => tx.raw);
    const raw = [rawHeader, rawTransactions];

    const serialized = rlpEncode(raw);

    // make a new block, but pass `null` so it doesn't do the extra
    // deserialization work since we already have everything in a deserialized
    // state here. We'll just set it ourselves by reaching into the "_private"
    // fields.
    const block = new Block(null, null);
    (block as any)._size = serialized.length;
    (block as any)._raw = rawHeader;
    (block as any)._rawTransactions = rawTransactions;
    (block as any)._transactions = transactions;
    (block as any).header = makeHeader(rawHeader);

    return {
      block,
      serialized
    };
  }
}
