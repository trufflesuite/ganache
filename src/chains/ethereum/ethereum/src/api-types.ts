import type { TypedData as NotTypedData, signTypedData_v4 } from "eth-sig-util";
import type * as TransactionTypes from "@ganache/ethereum-transaction";
import type * as UtilTypes from "@ganache/ethereum-utils";
import type { EthereumProvider } from "./provider";
import { Data, Quantity } from "@ganache/utils";
import { ITraceData } from "@ganache/ethereum-utils";

type Primitives = string | number | null | undefined | symbol | bigint;
type Externalize<X> = X extends Primitives
  ? X
  : X extends Quantity | Data | ITraceData
  ? string
  : { [N in keyof X]: Externalize<X[N]> };

export namespace Ethereum {
  export type Provider = EthereumProvider;

  // trace/debug
  export type TraceTransactionOptions = UtilTypes.TransactionTraceOptions
  export type TraceTransactionResult<T extends "external" | "internal" = "external"> = T extends "internal" ? UtilTypes.TraceTransactionResult : Externalize<TraceTransactionResult<"internal">>

  // storage
  export type StorageRangeAtResult<T extends "external" | "internal" = "external"> = T extends "internal" ? UtilTypes.StorageRangeAtResult : Externalize<StorageRangeAtResult<"internal">>

  // subscriptions/filters
  export type SubscriptionOptions = UtilTypes.BaseFilterArgs
  export type LogsFilter = UtilTypes.FilterArgs
  export type Filter = UtilTypes.RangeFilterArgs
  export type SubscriptionName = UtilTypes.SubscriptionName

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

  export type TransactionPoolContent<T extends "external" | "internal" = "external"> = {
    pending: Record<string, Record<string, PooledTransaction<T>>>;
    queued: Record<string, Record<string, PooledTransaction<T>>>;
  };


  /**
   * Options for `evm_mine`.
   */
  export type MineOptions = {
    timestamp?: number;
    blocks?: number;
  };

  export type TypedData = Exclude<
    Parameters<typeof signTypedData_v4>[1]["data"],
    NotTypedData
  >;
}
