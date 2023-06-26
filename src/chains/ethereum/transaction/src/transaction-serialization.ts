import { Quantity, Data, JsonRpcErrorCode } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import { GanacheRawExtraTx, TypedRawTransaction } from "./raw";
import { encode } from "@ganache/rlp";
import { TransactionType } from "./transaction-factory";
import { Transaction } from "./rpc-transaction";
import { AccessLists } from "./access-lists";
import { CodedError } from "@ganache/ethereum-utils";
import { EIP1559FeeMarketTransaction } from "./eip1559-fee-market-transaction";

export function serializeRpcForDb(
  tx: Transaction,
  blockHash: Data,
  blockNumber: Quantity,
  transactionIndex: Quantity
) {
  let type: number;
  if (!("type" in tx) || tx.type === undefined) {
    type = TransactionType.Legacy;
  } else {
    type = parseInt(tx.type, 16);
  }

  let effectiveGasPrice: Quantity;

  switch (type) {
    case TransactionType.Legacy:
    case TransactionType.EIP2930AccessList:
      effectiveGasPrice = Quantity.from(tx.gasPrice);
      break;
    case TransactionType.EIP1559AccessList:
      effectiveGasPrice = Quantity.from(
        EIP1559FeeMarketTransaction.getEffectiveGasPrice(
          // this becomes problematic because we need the baseFeePerGas which
          // comes from the block :(
          0n,
          Quantity.toBigInt(tx.maxFeePerGas),
          Quantity.toBigInt(tx.maxPriorityFeePerGas)
        )
      );
      break;
  }
  const txData = {
    raw: rawFromRpc(tx, type),
    from: Address.from(tx.from),
    hash: Data.from((tx as any).hash, 32),
    effectiveGasPrice,
    type: Quantity.from(type)
  };

  return serializeForDb(txData, blockHash, blockNumber, transactionIndex);
}

export function serializeForDb(
  tx: {
    raw: TypedRawTransaction;
    from: Address;
    hash: Data;
    effectiveGasPrice: Quantity;
    type: Quantity;
  },
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
      tx.from.toBuffer(),
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
  txData: Transaction,
  txType: number
): TypedRawTransaction {
  // if no access list is provided, we convert to legacy
  const targetType =
    txType === TransactionType.EIP2930AccessList &&
    txData.accessList === undefined
      ? TransactionType.Legacy
      : txType;

  switch (targetType) {
    case TransactionType.Legacy:
      return [
        Quantity.toBuffer(txData.nonce),
        Quantity.toBuffer(txData.gasPrice),
        Quantity.toBuffer(txData.gas || txData.gasLimit),
        // todo: use address?
        Data.toBuffer(txData.to, 20),
        Quantity.toBuffer(txData.value),
        Data.toBuffer(txData.data || txData.input),
        Data.toBuffer((txData as any).v),
        Data.toBuffer((txData as any).r),
        Data.toBuffer((txData as any).s)
      ];
    case TransactionType.EIP2930AccessList:
      return [
        Quantity.toBuffer(txData.chainId),
        Quantity.toBuffer(txData.nonce),
        Quantity.toBuffer(txData.gasPrice),
        Quantity.toBuffer(txData.gas || txData.gasLimit),
        // todo: use address?
        Data.toBuffer(txData.to, 20),
        Quantity.toBuffer(txData.value),
        Data.toBuffer(txData.data || txData.input),
        // accesslists is _always_ set, otherwise it's legacy
        txData.accessList
          ? AccessLists.getAccessListData(txData.accessList).accessList
          : [],
        Data.toBuffer((txData as any).v),
        Data.toBuffer((txData as any).r),
        Data.toBuffer((txData as any).s)
      ];
    // todo: should this be TransactionType.EIP1559FeeMarket?
    case TransactionType.EIP1559AccessList:
      return [
        Quantity.toBuffer(txData.chainId),
        Quantity.toBuffer(txData.nonce),
        Quantity.toBuffer(txData.maxPriorityFeePerGas),
        Quantity.toBuffer(txData.maxFeePerGas),
        Quantity.toBuffer(txData.gas || txData.gasLimit),
        // todo: use address?
        Data.toBuffer(txData.to, 20),
        Quantity.toBuffer(txData.value),
        Data.toBuffer(txData.data || txData.input),
        txData.accessList
          ? AccessLists.getAccessListData(txData.accessList).accessList
          : [],
        Data.toBuffer((txData as any).v),
        Data.toBuffer((txData as any).r),
        Data.toBuffer((txData as any).s)
      ];
    default:
      throw new CodedError(
        `Tx instantiation with supplied type not supported`,
        JsonRpcErrorCode.METHOD_NOT_FOUND
      );
  }
}
