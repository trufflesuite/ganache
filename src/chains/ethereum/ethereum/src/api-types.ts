import type { TypedData as NotTypedData, signTypedData_v4 } from "eth-sig-util";

export type {
  Transaction,
  TypedTransactionJSON as SignedTransaction
} from "@ganache/ethereum-transaction";
import type { TypedTransactionJSON as SignedTransaction } from "@ganache/ethereum-transaction";

/**
 * Pending and Executable transactions that are still in the transaction pool
 * and do not yet have a blockNumber, blockHash, and transactionIndex.
 */
export type QueuedTransaction = Omit<
  SignedTransaction,
  "blockNumber" | "blockHash" | "transactionIndex"
> & {
  blockNumber: null;
  blockHash: null;
  transactionIndex: null;
};

export type MineOptions = {
  timestamp?: number;
  blocks?: number;
};

export type TypedData = Exclude<
  Parameters<typeof signTypedData_v4>[1]["data"],
  NotTypedData
>;
export type { SubscriptionName } from "@ganache/ethereum-utils";

export type {
  BaseFilterArgs as SubscriptionOptions,
  FilterArgs as LogsFilter,
  RangeFilterArgs as Filter
} from "@ganache/ethereum-utils";

export type {
  TransactionTraceOptions as TraceTransactionOptions,
  TraceTransactionResult,
  StorageRangeAtResult
} from "@ganache/ethereum-utils";
