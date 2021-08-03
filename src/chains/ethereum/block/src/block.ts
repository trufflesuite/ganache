import { Data, Quantity } from "@ganache/utils";
import {
  BlockTransaction,
  EthereumRawTx,
  GanacheRawBlockTransactionMetaData
} from "@ganache/ethereum-transaction";
import type Common from "@ethereumjs/common";
import { encode, decode } from "@ganache/rlp";
import { BlockHeader, makeHeader } from "./runtime-block";
import { keccak, BUFFER_EMPTY } from "@ganache/utils";
import {
  EthereumRawBlockHeader,
  GanacheRawBlock,
  serialize
} from "./serialize";
import { Address } from "@ganache/ethereum-address";

export class Block {
  protected _size: number;
  protected _raw: EthereumRawBlockHeader;
  protected _common: Common;
  protected _rawTransactions: EthereumRawTx[];
  protected _rawTransactionMetaData: GanacheRawBlockTransactionMetaData[];

  public header: BlockHeader;

  constructor(serialized: Buffer, common: Common) {
    this._common = common;
    if (serialized) {
      const deserialized = decode<GanacheRawBlock>(serialized);
      this._raw = deserialized[0];
      this._rawTransactions = deserialized[1] || [];
      // TODO: support actual uncle data (needed for forking!)
      // Issue: https://github.com/trufflesuite/ganache-core/issues/786
      // const uncles = deserialized[2];
      const totalDifficulty = deserialized[3];
      this.header = makeHeader(this._raw, totalDifficulty);
      this._rawTransactionMetaData = deserialized[4] || [];
      this._size = Quantity.from(deserialized[5]).toNumber();
    }
  }

  private _hash: Data;
  hash() {
    return (
      this._hash || (this._hash = Data.from(keccak(encode(this._raw)), 32))
    );
  }

  getTransactions() {
    const common = this._common;
    return this._rawTransactions.map(
      (raw, index) =>
        new BlockTransaction(
          raw,
          this._rawTransactionMetaData[index],
          this.hash().toBuffer(),
          this.header.number.toBuffer(),
          Quantity.from(index).toBuffer(),
          common
        )
    );
  }

  toJSON(includeFullTransactions = false) {
    const hash = this.hash();
    const txFn = this.getTxFn(includeFullTransactions);
    const hashBuffer = hash.toBuffer();
    const number = this.header.number.toBuffer();
    const common = this._common;
    const jsonTxs = this._rawTransactions.map((raw, index) => {
      const tx = new BlockTransaction(
        raw,
        this._rawTransactionMetaData[index],
        hashBuffer,
        number,
        Quantity.from(index).toBuffer(),
        common
      );
      return txFn(tx);
    });

    return {
      hash,
      ...this.header,
      size: Quantity.from(this._size),
      transactions: jsonTxs,
      uncles: [] as string[] // this.value.uncleHeaders.map(function(uncleHash) {return to.hex(uncleHash)})
    };
  }

  static rawFromJSON(json: any) {
    const header: EthereumRawBlockHeader = [
      Data.from(json.parentHash).toBuffer(),
      Data.from(json.sha3Uncles).toBuffer(),
      Address.from(json.miner).toBuffer(),
      Data.from(json.stateRoot).toBuffer(),
      Data.from(json.transactionsRoot).toBuffer(),
      Data.from(json.receiptsRoot).toBuffer(),
      Data.from(json.logsBloom).toBuffer(),
      Quantity.from(json.difficulty).toBuffer(),
      Quantity.from(json.number).toBuffer(),
      Quantity.from(json.gasLimit).toBuffer(),
      Quantity.from(json.gasUsed).toBuffer(),
      Quantity.from(json.timestamp).toBuffer(),
      Data.from(json.extraData).toBuffer(),
      Data.from(json.mixHash).toBuffer(),
      Data.from(json.nonce).toBuffer()
    ];
    const totalDifficulty = Quantity.from(json.totalDifficulty).toBuffer();
    const txs: EthereumRawTx[] = [];
    const extraTxs: GanacheRawBlockTransactionMetaData[] = [];
    json.transactions.forEach(tx => {
      txs.push([
        Quantity.from(tx.nonce).toBuffer(),
        Quantity.from(tx.gasPrice).toBuffer(),
        Quantity.from(tx.gas).toBuffer(),
        tx.to == null ? BUFFER_EMPTY : Address.from(tx.to).toBuffer(),
        Quantity.from(tx.value).toBuffer(),
        Data.from(tx.input).toBuffer(),
        Quantity.from(tx.v).toBuffer(),
        Quantity.from(tx.r).toBuffer(),
        Quantity.from(tx.s).toBuffer()
      ]);
      extraTxs.push([
        Quantity.from(tx.from).toBuffer(),
        Quantity.from(tx.hash).toBuffer()
      ]);
    });

    return serialize([header, txs, [], totalDifficulty, extraTxs]).serialized;
  }

  getTxFn(
    include = false
  ): (tx: BlockTransaction) => ReturnType<BlockTransaction["toJSON"]> | Data {
    if (include) {
      return (tx: BlockTransaction) => tx.toJSON();
    } else {
      return (tx: BlockTransaction) => tx.hash;
    }
  }

  static fromParts(
    rawHeader: EthereumRawBlockHeader,
    txs: EthereumRawTx[],
    totalDifficulty: Buffer,
    extraTxs: GanacheRawBlockTransactionMetaData[],
    size: number,
    common: Common
  ): Block {
    const block = new Block(null, common);
    block._raw = rawHeader;
    block._rawTransactions = txs;
    block.header = makeHeader(rawHeader, totalDifficulty);
    block._rawTransactionMetaData = extraTxs;
    block._size = size;
    return block;
  }
}
