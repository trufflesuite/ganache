import { Data, Quantity } from "@ganache/utils";
import { BlockTransaction, BlockRawTx } from "@ganache/ethereum-transaction";
import Common from "ethereumjs-common";
import { encode, decode } from "@ganache/rlp";
import { BlockHeader, makeHeader, getBlockSize } from "./runtime-block";
import { utils } from "@ganache/utils";
const { keccak } = utils;

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
      const deserialized = (decode(serialized) as any) as [
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
      this._hash || (this._hash = Data.from(keccak(encode(this._raw)), 32))
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
