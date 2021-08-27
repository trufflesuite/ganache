import { Data, Quantity } from "@ganache/utils";
import {
  GanacheRawBlockTransactionMetaData,
  GanacheRawExtraTx,
  TransactionFactory,
  TypedDatabaseTransaction,
  TypedTransaction
} from "@ganache/ethereum-transaction";
import type Common from "@ethereumjs/common";
import { encode, decode } from "@ganache/rlp";
import { BlockHeader, makeHeader } from "./runtime-block";
import { keccak } from "@ganache/utils";
import {
  EthereumRawBlockHeader,
  GanacheRawBlock,
  serialize
} from "./serialize";
import { Address } from "@ganache/ethereum-address";
import { BlockParams } from "./block-params";
export class Block {
  protected _size: number;
  protected _raw: EthereumRawBlockHeader;
  protected _common: Common;
  protected _rawTransactions: TypedDatabaseTransaction[];
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
    return this._rawTransactions.map((raw, index) => {
      const [from, hash] = this._rawTransactionMetaData[index];
      const extra: GanacheRawExtraTx = [
        from,
        hash,
        this.hash().toBuffer(),
        this.header.number.toBuffer(),
        Quantity.from(index).toBuffer()
      ];
      return TransactionFactory.fromDatabaseTx(raw, common, extra);
    });
  }

  toJSON(includeFullTransactions = false) {
    const hash = this.hash();
    const txFn = this.getTxFn(includeFullTransactions);
    const hashBuffer = hash.toBuffer();
    const number = this.header.number.toBuffer();
    const common = this._common;
    const jsonTxs = this._rawTransactions.map((raw, index) => {
      const [from, hash] = this._rawTransactionMetaData[index];
      const extra: GanacheRawExtraTx = [
        from,
        hash,
        hashBuffer,
        number,
        Quantity.from(index).toBuffer()
      ];
      const tx = TransactionFactory.fromDatabaseTx(raw, common, extra);
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

  static rawFromJSON(json: any, common: Common) {
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
    const txs: TypedDatabaseTransaction[] = [];
    const extraTxs: GanacheRawBlockTransactionMetaData[] = [];
    json.transactions.forEach(tx => {
      const typedTx = TransactionFactory.fromRpc(tx, common);
      const raw = typedTx.toEthRawTransaction(
        typedTx.v.toBuffer(),
        typedTx.r.toBuffer(),
        typedTx.s.toBuffer()
      );
      txs.push(<TypedDatabaseTransaction>raw);
      extraTxs.push([
        Quantity.from(tx.from).toBuffer(),
        Quantity.from(tx.hash).toBuffer()
      ]);
    });

    return serialize([header, txs, [], totalDifficulty, extraTxs]).serialized;
  }

  getTxFn(
    include = false
  ): (tx: TypedTransaction) => ReturnType<TypedTransaction["toJSON"]> | Data {
    if (include) {
      return (tx: TypedTransaction) => tx.toJSON();
    } else {
      return (tx: TypedTransaction) => tx.hash;
    }
  }

  static fromParts(
    rawHeader: EthereumRawBlockHeader,
    txs: TypedDatabaseTransaction[],
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

  static calcNextBaseFee(common: Common, parentBlock?: Block) {
    if (!common.isActivatedEIP(1559)) {
      return undefined;
    }
    // genesis block
    if (parentBlock === undefined) {
      return BlockParams.INITIAL_BASE_FEE_PER_GAS;
    }
    const header = parentBlock.header;
    const parentGasTarget = header.gasLimit.toNumber() / BlockParams.ELASTICITY;
    const parentGasUsed = header.gasUsed.toNumber();
    if (parentGasTarget === parentGasUsed) {
      return header.baseFeePerGas.toBuffer();
    } else {
      const baseFeePerGasNum = header.baseFeePerGas.toNumber();
      const gasUsedDelta = Math.abs(parentGasTarget - parentGasUsed);
      // TODO: consider using BN to use proper integer division
      const adjustedFeeDelta = Math.floor(
        (baseFeePerGasNum * gasUsedDelta) /
          parentGasTarget /
          BlockParams.BASE_FEE_MAX_CHANGE_DENOMINATOR
      );

      if (parentGasUsed > parentGasTarget) {
        return Quantity.from(
          baseFeePerGasNum + Math.max(adjustedFeeDelta, 1)
        ).toBuffer();
      } else {
        return Quantity.from(baseFeePerGasNum - adjustedFeeDelta).toBuffer();
      }
    }
  }
}
