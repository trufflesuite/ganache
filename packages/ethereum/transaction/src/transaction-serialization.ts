import { Quantity, Data, JsonRpcErrorCode } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import {
  EIP1559FeeMarketRawTransaction,
  EIP2930AccessListRawTransaction,
  GanacheRawExtraTx,
  LegacyRawTransaction,
  TypedRawTransaction
} from "./raw";
import { encode } from "@ganache/rlp";
import {
  EIP1559FeeMarketRpcTransaction,
  EIP2930AccessListRpcTransaction,
  LegacyRpcTransaction,
  Transaction,
  TransactionType
} from "./rpc-transaction";
import { AccessLists } from "./access-lists";
import { CodedError } from "@ganache/ethereum-utils";

export function serializeRpcForDb(
  tx: Transaction,
  blockHash: Data,
  blockNumber: Quantity,
  transactionIndex: Quantity
): Buffer {
  let type: number;
  if (!("type" in tx) || tx.type === undefined) {
    type = TransactionType.Legacy;
  } else {
    type = parseInt(tx.type, 16);
  }

  const txData = {
    raw: rawFromRpc(tx, type),
    from: Address.from(tx.from),
    hash: Data.from((tx as any).hash, 32),
    // this assumes that gasPrice has been set - even for EIP-1559 Fee Market transactions
    effectiveGasPrice: Quantity.from(tx.gasPrice),
    type: Quantity.from(type)
  };

  return serializeForDb(txData, blockHash, blockNumber, transactionIndex);
}

export type SerializableTransaction = {
  raw: TypedRawTransaction;
  from: Address;
  hash: Data;
  effectiveGasPrice: Quantity;
  type: Quantity;
};

export function serializeForDb(
  tx: SerializableTransaction,
  blockHash: Data,
  blockNumber: Quantity,
  transactionIndex: Quantity
): Buffer {
  const legacy = tx.raw.length === 9;
  // todo(perf):make this work with encodeRange and digest
  const txAndExtraData: [TypedRawTransaction, GanacheRawExtraTx] = [
    // todo: this is encoded differently in the tx table than it is in the
    // block table. we should migrate the tx table to use the same format as
    // the block (`Buffer.concat([type, encode(raw)])`) so that we can avoid
    // block it twice for each block save step.
    legacy ? tx.raw : ([tx.type.toBuffer(), ...tx.raw] as any),
    [
      tx.from.buf,
      tx.hash.toBuffer(),
      blockHash.toBuffer(),
      blockNumber.toBuffer(),
      transactionIndex.toBuffer(),
      tx.effectiveGasPrice.toBuffer()
    ]
  ];

  return encode(txAndExtraData);
}

export function rawFromRpc(
  txData: LegacyRpcTransaction,
  txType: TransactionType.Legacy
): LegacyRawTransaction;
export function rawFromRpc(
  txData: EIP2930AccessListRpcTransaction,
  txType: TransactionType.EIP1559AccessList
): EIP2930AccessListRawTransaction | LegacyRawTransaction;
export function rawFromRpc(
  txData: EIP1559FeeMarketRpcTransaction,
  txType: TransactionType.EIP1559AccessList
): EIP1559FeeMarketRawTransaction;
export function rawFromRpc(
  txData: Transaction,
  txType: TransactionType
): TypedRawTransaction;
export function rawFromRpc(
  txData: Transaction,
  txType: TransactionType
): TypedRawTransaction {
  const chainId = Quantity.toBuffer(txData.chainId);
  const nonce = Quantity.toBuffer(txData.nonce);
  const gasPrice = Quantity.toBuffer(txData.gasPrice);
  const gasLimit = Quantity.toBuffer(txData.gas || txData.gasLimit);
  // todo: use Address type
  const to = Data.toBuffer(txData.to, 20);
  const value = Quantity.toBuffer(txData.value);
  const data = Data.toBuffer(txData.data || txData.input);
  const v = Data.toBuffer((txData as any).v);
  const r = Data.toBuffer((txData as any).r);
  const s = Data.toBuffer((txData as any).s);

  // if no access list is provided, we convert to legacy
  const targetType =
    txType === TransactionType.EIP2930AccessList &&
    txData.accessList === undefined
      ? TransactionType.Legacy
      : txType;

  switch (targetType) {
    case TransactionType.Legacy:
      return [nonce, gasPrice, gasLimit, to, value, data, v, r, s];
    case TransactionType.EIP2930AccessList:
      return [
        chainId,
        nonce,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        // accesslists is _always_ set, otherwise it's legacy
        txData.accessList
          ? AccessLists.getAccessListData(txData.accessList).accessList
          : [],
        v,
        r,
        s
      ];
    // todo: should this be TransactionType.EIP1559FeeMarket?
    case TransactionType.EIP1559AccessList:
      return [
        chainId,
        nonce,
        Quantity.toBuffer(txData.maxPriorityFeePerGas),
        Quantity.toBuffer(txData.maxFeePerGas),
        gasLimit,
        to,
        value,
        data,
        txData.accessList
          ? AccessLists.getAccessListData(txData.accessList).accessList
          : [],
        v,
        r,
        s
      ];
    default:
      throw new CodedError(
        "Tx instantiation with supplied type not supported",
        JsonRpcErrorCode.METHOD_NOT_FOUND
      );
  }
}
