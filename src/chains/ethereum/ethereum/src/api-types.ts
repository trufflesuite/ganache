import type * as EthSigUtil from "eth-sig-util";
import type * as TransactionTypes from "@ganache/ethereum-transaction";
import type * as UtilTypes from "@ganache/ethereum-utils";
import type { EthereumProvider, Externalize } from "./provider";
import { BlockHeader } from "@ganache/ethereum-block";
import { Data, Quantity } from "@ganache/utils";

export namespace Ethereum {
  export type Provider = EthereumProvider;

  // trace/debug
  export type TraceTransactionOptions = UtilTypes.TransactionTraceOptions
  export type TraceTransactionResult<T extends "external" | "internal" = "external"> = T extends "internal" ? UtilTypes.TraceTransactionResult : Externalize<TraceTransactionResult<"internal">>
  export type StorageRangeAtResult<T extends "external" | "internal" = "external"> = T extends "internal" ? UtilTypes.StorageRangeAtResult : Externalize<StorageRangeAtResult<"internal">>

  // subscriptions/filters
  export type SubscriptionOptions = UtilTypes.BaseFilterArgs
  export type LogsFilter = UtilTypes.FilterArgs
  export type Filter = UtilTypes.RangeFilterArgs
  export type SubscriptionName = UtilTypes.SubscriptionName
  export type SubscriptionId = UtilTypes.SubscriptionId

  // transactions
  export type Transaction = TransactionTypes.Transaction
  export type CallTransaction = TransactionTypes.CallTransaction
  export type SignedTransaction<T extends "external" | "internal" = "external"> = T extends "internal" ? TransactionTypes.TypedTransactionJSON : Externalize<SignedTransaction<"internal">>
  export type TransactionReceipt<T extends "external" | "internal" = "external"> = T extends "internal" ? TransactionTypes.TransactionReceipt : Externalize<TransactionReceipt<"internal">>

  /**
   * Pending and Executable transactions that are still in the transaction pool
   * and do not yet have a blockNumber, blockHash, and transactionIndex.
   */
  export type PooledTransaction<T extends "external" | "internal" = "external"> = Omit<
    SignedTransaction<T>,
    "blockNumber" | "blockHash" | "transactionIndex"
  > & {
    blockNumber: null;
    blockHash: null;
    transactionIndex: null;
  };

  // Transaction Pool
  export type TransactionPoolContent<T extends "external" | "internal" = "external"> = {
    pending: Record<string, Record<string, PooledTransaction<T>>>;
    queued: Record<string, Record<string, PooledTransaction<T>>>;
  };

  // Mine
  export type MineOptions = {
    timestamp?: number;
    blocks?: number;
  };

  // Sign Typed Data
  export type TypedData = Exclude<
    Parameters<typeof EthSigUtil.signTypedData_v4>[1]["data"],
    EthSigUtil.TypedData
  >;

  // whisper
  export type WhisperPostObject = UtilTypes.WhisperPostObject;

  // blocks
  /**
   * A Block as it is returned from eth_getBlockByNumber and eth_getBlockByHash.
   */
  export type Block<IncludeTransactions extends boolean = false, T extends "external" | "internal" = "external"> =
    T extends "internal" ?
    {
      hash: Data
      size: Quantity
      transactions: IncludeTransactions extends true ? (SignedTransaction<T> | PooledTransaction<T>)[] : Data[],
      uncles: Data[]
    } & BlockHeader
    : {
      hash: string
      size: string
      transactions: IncludeTransactions extends true ? (SignedTransaction<T> | PooledTransaction<T>)[] : string[],
      uncles: string[]
    } & Externalize<BlockHeader>
}
