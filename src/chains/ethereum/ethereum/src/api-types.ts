import type * as EthSigUtil from "eth-sig-util";
import type * as TransactionTypes from "@ganache/ethereum-transaction";
import type * as UtilTypes from "@ganache/ethereum-utils";
import type { EthereumProvider, Externalize } from "./provider";
import { BlockHeader } from "@ganache/ethereum-block";
import { Data, Quantity } from "@ganache/utils";
import { CallOverrides } from "./helpers/simulation-handler";
import { Log, InternalTag } from "@ganache/ethereum-utils";

type EthSignedDataParams = Parameters<
  typeof EthSigUtil.signTypedData_v4
>[1]["data"];

type AsCall<T> = Flatten<
  Omit<T, "from"> & {
    readonly from?: string;
  }
>;
type AsPooled<T> = Flatten<
  Omit<T, "blockNumber" | "blockHash" | "transactionIndex"> & {
    blockNumber: null;
    blockHash: null;
    transactionIndex: null;
  }
>;

type PublicPrivate = "public" | "private";

/**
 * Since our types come from all over the place and get smushed together and
 * pulled apart, we "Flatten" (there is probably a
 * better word) these type complexities by using a TypeScript trick:
 * `Pick<T, keyof T>`. This picks all the keys (and their values) from T,
 * resulting in the same type shape, but the intermediate types are all skipped
 * and intersections are simplified.
 *
 * ```
 * type SomeTypes = {prop: string, prop2: number};
 * type Thing = Omit<SomeTypes, "prop2"> & {addProp: true};
 * ```
 * gets turned into
 * ```
 * type Thing = {prop: string, addProp: true}
 * ```
 */
type Flatten<T> = Pick<T, keyof T>;

/** Public types */
export namespace Ethereum {
  export type Provider = EthereumProvider;
  export type Tag = keyof typeof InternalTag;

  //#region trace/debug
  export type TraceTransactionOptions = UtilTypes.TraceTransactionOptions;
  export type TraceTransactionResult<P extends PublicPrivate = "public"> =
    P extends "public"
      ? Externalize<TraceTransactionResult<"private">>
      : UtilTypes.TraceTransactionResult;
  export type StorageRangeAtResult<P extends PublicPrivate = "public"> =
    P extends "public"
      ? Externalize<StorageRangeAtResult<"private">>
      : UtilTypes.StorageRangeAtResult;
  //#endregion

  //#region subscriptions/filters
  export type SubscriptionOptions = UtilTypes.BaseFilterArgs;
  export type LogsFilter = UtilTypes.FilterArgs;
  export type Filter = UtilTypes.RangeFilterArgs;
  export type SubscriptionName = UtilTypes.SubscriptionName;
  export type SubscriptionId = UtilTypes.SubscriptionId;
  export type Logs = Log[];
  //#endregion subscriptions/filters

  //#region transactions
  export namespace Transaction {
    export type Legacy = Flatten<TransactionTypes.LegacyRpcTransaction>;
    export type EIP1559 =
      Flatten<TransactionTypes.EIP1559FeeMarketRpcTransaction>;
    export type EIP2930 =
      Flatten<TransactionTypes.EIP2930AccessListRpcTransaction>;

    /**
     * Transaction receipt returned from `eth_getTransactionReceipt`
     */
    export type Receipt<P extends PublicPrivate = "public"> = P extends "public"
      ? Externalize<Transaction.Receipt<"private">>
      : TransactionTypes.TransactionReceipt;
  }

  /**
   * Transaction types sent to `eth_sendTransaction` and
   * `personal_sendTransaction`
   */
  export type Transaction =
    | Ethereum.Transaction.Legacy
    | Ethereum.Transaction.EIP1559
    | Ethereum.Transaction.EIP2930;
  //#endregion transactions

  //#region call/estimate
  export namespace Call {
    export namespace Transaction {
      export type Legacy = AsCall<Ethereum.Transaction.Legacy>;
      export type EIP1559 = AsCall<Ethereum.Transaction.EIP1559>;
      export type EIP2930 = AsCall<Ethereum.Transaction.EIP2930>;
    }

    export type Transaction =
      | Ethereum.Call.Transaction.Legacy
      | Ethereum.Call.Transaction.EIP1559
      | Ethereum.Call.Transaction.EIP2930;

    export type Overrides = CallOverrides;
  }

  //#endregion call/estimate

  //#region Pool
  export namespace Pool {
    export namespace Transaction {
      export type Legacy = AsPooled<Ethereum.Block.Transaction.Legacy>;
      export type EIP1559 = AsPooled<Ethereum.Block.Transaction.EIP1559>;
      export type EIP2930 = AsPooled<Ethereum.Block.Transaction.EIP2930>;
    }
    /**
     * Pending and Executable transactions that are still in the transaction pool
     * and do not yet have a blockNumber, blockHash, and transactionIndex.
     */
    export type Transaction<P extends PublicPrivate = "public"> = AsPooled<
      Ethereum.Block.Transaction<P>
    >;

    // txpool_content
    export type Content<P extends PublicPrivate = "public"> = {
      pending: Record<string, Record<string, Ethereum.Pool.Transaction<P>>>;
      queued: Record<string, Record<string, Ethereum.Pool.Transaction<P>>>;
    };
  }
  //#endregion Pool

  //#region blocks
  export namespace Block {
    export type Header<P extends PublicPrivate = "public"> = P extends "public"
      ? Externalize<Ethereum.Block.Header<"private">>
      : BlockHeader;
    export namespace Transaction {
      export type Legacy = Externalize<TransactionTypes.LegacyTransactionJSON>;

      export type EIP2930 =
        Externalize<TransactionTypes.EIP2930AccessListTransactionJSON>;

      export type EIP1559 =
        Externalize<TransactionTypes.EIP1559FeeMarketTransactionJSON>;
    }

    export type Transaction<P extends PublicPrivate = "public"> =
      P extends "public"
        ? Externalize<Ethereum.Block.Transaction<"private">>
        :
            | TransactionTypes.LegacyTransactionJSON
            | TransactionTypes.EIP2930AccessListTransactionJSON
            | TransactionTypes.EIP1559FeeMarketTransactionJSON;
  }

  /**
   * A Block as it is returned from eth_getBlockByNumber and eth_getBlockByHash.
   */
  export type Block<
    // TODO: the actual type should be `IncludeTransactions extends boolean = false`
    // but TypeScript can't yet infer it all the way to our `provider.request` method.
    // See: https://github.com/trufflesuite/ganache/issues/2907
    IncludeTransactions extends boolean = true | false,
    P extends PublicPrivate = "public"
  > = P extends "public"
    ? Externalize<Ethereum.Block<IncludeTransactions, "private">>
    : {
        hash: Data;
        size: Quantity;
        transactions: IncludeTransactions extends true
          ? (Ethereum.Block.Transaction<P> | Ethereum.Pool.Transaction<P>)[]
          : Data[];
        uncles: Data[];
      } & Ethereum.Block.Header<P>;
  //#endregion blocks

  // Mine (evm_mine)
  export type MineOptions = {
    timestamp?: number;
    blocks?: number;
  };

  // Sign Typed Data
  export type TypedData = Exclude<EthSignedDataParams, EthSigUtil.TypedData>;

  // whisper
  export type WhisperPostObject = UtilTypes.WhisperPostObject;
}
