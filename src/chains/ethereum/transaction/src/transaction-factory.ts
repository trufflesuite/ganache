import { Data, JsonRpcErrorCode } from "@ganache/utils";
import type Common from "@ethereumjs/common";
import { LegacyTransaction } from "./legacy-transaction";
import { EIP2930AccessListTransaction } from "./eip2930-access-list-transaction";
import { TypedRpcTransaction } from "./rpc-transaction";
import {
  EIP1559FeeMarketDatabasePayload,
  EIP2930AccessListDatabasePayload,
  GanacheRawExtraTx,
  LegacyDatabasePayload,
  TypedDatabasePayload,
  TypedDatabaseTransaction
} from "./raw";
import { decode } from "@ganache/rlp";
import { CodedError } from "@ganache/ethereum-utils";
import { TypedTransaction } from "./transaction-types";
import { EIP1559FeeMarketTransaction } from "./eip1559-fee-market-transaction";

const UNTYPED_TX_START_BYTE = 0xc0; // all txs with first byte >= 0xc0 are untyped
const LEGACY_TX_TYPE_ID = 0x0;
const EIP2930_ACCESS_LIST_TX_TYPE_ID = 0x1;
const EIP1559_FEE_MARKET_TX_TYPE_ID = 0x2;

export class TransactionFactory {
  public tx: TypedTransaction;
  constructor(raw: Buffer, common: Common) {
    const [txData, extra] = (decode(raw) as any) as [
      TypedDatabaseTransaction,
      GanacheRawExtraTx
    ];
    this.tx = TransactionFactory.fromDatabaseTx(txData, common, extra);
  }
  private static _fromData(
    txData: TypedRpcTransaction | TypedDatabasePayload,
    txType:
      | typeof EIP2930AccessListTransaction
      | typeof LegacyTransaction
      | typeof EIP1559FeeMarketTransaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    // if tx type envelope isn't available yet on this HF,
    // return legacy txs as is and convert typed txs to legacy
    if (!common.isActivatedEIP(2718)) {
      if (txType === LegacyTransaction) {
        return LegacyTransaction.fromTxData(
          <LegacyDatabasePayload | TypedRpcTransaction>txData,
          common,
          extra
        );
      }
      if (txType === EIP2930AccessListTransaction) {
        return LegacyTransaction.fromEIP2930AccessListTransaction(
          <EIP2930AccessListDatabasePayload | TypedRpcTransaction>txData,
          common
        );
      } else if (txType === EIP1559FeeMarketTransaction) {
        return LegacyTransaction.fromEIP15590FeeMarketTransaction(
          <EIP1559FeeMarketDatabasePayload | TypedRpcTransaction>txData,
          common
        );
      }
    } else if (!common.isActivatedEIP(1559)) {
      if (txType === LegacyTransaction) {
        return LegacyTransaction.fromTxData(
          <TypedRpcTransaction>txData,
          common,
          extra
        );
      } else if (txType === EIP2930AccessListTransaction) {
        if (common.isActivatedEIP(2930)) {
          return EIP2930AccessListTransaction.fromTxData(
            <EIP2930AccessListDatabasePayload | TypedRpcTransaction>txData,
            common,
            extra
          );
        } else {
          // TODO: I believe this is unreachable with current architecture.
          // If 2718 is supported, so is 2930.
          throw new CodedError(
            `EIP 2930 is not activated.`,
            JsonRpcErrorCode.INVALID_PARAMS
          );
        }
      } else if (txType === EIP1559FeeMarketTransaction) {
        throw new CodedError(
          `EIP 1559 is not activated.`,
          JsonRpcErrorCode.INVALID_PARAMS
        );
      }
    }
    // eip 1559, 2930, and 2718 are activated
    else {
      // we can assume that all database transactions came from us, so
      // the type doesn't need to be normalized.
      if (Array.isArray(txData)) {
        if (txType === LegacyTransaction) {
          return LegacyTransaction.fromTxData(
            <LegacyDatabasePayload>txData,
            common,
            extra
          );
        } else if (txType === EIP2930AccessListTransaction) {
          return EIP2930AccessListTransaction.fromTxData(
            <EIP2930AccessListDatabasePayload>txData,
            common,
            extra
          );
        } else if (txType === EIP1559FeeMarketTransaction) {
          return EIP1559FeeMarketTransaction.fromTxData(
            <EIP1559FeeMarketDatabasePayload>txData,
            common,
            extra
          );
        }
      } else {
        const toEIP1559 =
          (txType === LegacyTransaction ||
            txType === EIP2930AccessListTransaction) &&
          txData.gasPrice === undefined;
        if (toEIP1559) {
          txData.maxFeePerGas = null;
          txData.maxPriorityFeePerGas = "0x0";
        }
        if (txType === EIP1559FeeMarketTransaction || toEIP1559) {
          return EIP1559FeeMarketTransaction.fromTxData(txData, common, extra);
        } else if (txType === LegacyTransaction) {
          return LegacyTransaction.fromTxData(txData, common, extra);
        } else if (txType === EIP2930AccessListTransaction) {
          // if no access list is provided, we convert to legacy
          if (txData.accessList === undefined) {
            return LegacyTransaction.fromTxData(txData, common, extra);
          } else {
            return EIP2930AccessListTransaction.fromTxData(
              txData,
              common,
              extra
            );
          }
        }
      }
    }
    throw new CodedError(
      `Tx instantiation with supplied type not supported`,
      JsonRpcErrorCode.METHOD_NOT_FOUND
    );
  }
  /**
   * Create a transaction from a `txData` object
   *
   * @param txData - The rpc transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
   * @param common - Options to pass on to the constructor of the transaction
   */
  public static fromRpc(txData: TypedRpcTransaction, common: Common) {
    const txType = this.typeOfRPC(txData);

    return this._fromData(txData, txType, common);
  }
  /**
   * Create a transaction from a `txData` object
   *
   * @param txData - The raw transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
   * @param common - Options to pass on to the constructor of the transaction
   */
  public static fromDatabaseTx(
    txData: TypedDatabaseTransaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    const txType = this.typeOfRaw(txData);
    return this._fromData(
      <TypedDatabasePayload>(
        (txType === LegacyTransaction ? txData : txData.slice(1)) // if the type is at the front, remove it
      ),
      txType,
      common,
      extra
    );
  }
  /**
   * Create a transaction from a `txData` object
   *
   * @param txData - The raw hex string transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
   * @param common - Options to pass on to the constructor of the transaction
   */
  public static fromString(txData: string, common: Common) {
    let data = Data.from(txData).toBuffer();
    const type = data[0];
    const txType = this.typeOf(type);
    const raw = decode<TypedDatabasePayload>(
      txType === LegacyTransaction ? data : data.slice(1)
    );
    return this._fromData(raw, txType, common);
  }

  public static typeOf(type: number) {
    if (
      type >= UNTYPED_TX_START_BYTE ||
      type === LEGACY_TX_TYPE_ID ||
      type === undefined
    ) {
      return LegacyTransaction;
    } else if (type === EIP2930_ACCESS_LIST_TX_TYPE_ID) {
      return EIP2930AccessListTransaction;
    } else if (type === EIP1559_FEE_MARKET_TX_TYPE_ID) {
      return EIP1559FeeMarketTransaction;
    }
  }

  public static typeOfRaw(raw: TypedDatabaseTransaction) {
    // LegacyTransactions won't have the type up front to parse
    if (raw.length === 9) {
      return LegacyTransaction;
    }
    const type = raw[0][0];
    return this.typeOf(type);
  }

  public static typeOfRPC(rpc: TypedRpcTransaction) {
    if (!("type" in rpc) || rpc.type === undefined) {
      return LegacyTransaction;
    } else {
      const txType = parseInt(rpc.type);
      return this.typeOf(txType);
    }
  }
}
