import { Data, JsonRpcErrorCode, Quantity } from "@ganache/utils";
import type { Common } from "@ethereumjs/common";
import { LegacyTransaction } from "./legacy-transaction";
import { EIP2930AccessListTransaction } from "./eip2930-access-list-transaction";
import { Transaction } from "./rpc-transaction";
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
import { SECP256K1_MAX_PRIVATE_KEY_DIV_2 } from "@ganache/secp256k1";

/**
 * @param common
 * @param tx
 * @throws
 */
function assertValidTransactionSValue(common: Common, tx: TypedTransaction) {
  // Transaction signatures whose s-value is greater than secp256k1n/2 are
  // invalid after EIP-2 hardfork (homestead). See: https://eips.ethereum.org/EIPS/eip-2
  if (
    tx.s &&
    tx.s.toBigInt() >= SECP256K1_MAX_PRIVATE_KEY_DIV_2 &&
    // EIP-2 is in homestead, but we can't use isActivatedEIP(2) because
    // Common doesn't have that information for this hardfork.
    common.gteHardfork("homestead")
  ) {
    throw new Error(
      "Invalid Signature: s-values greater than secp256k1n/2 are considered invalid"
    );
  }
}

export enum TransactionType {
  Legacy = 0x0,
  EIP2930AccessList = 0x1,
  EIP1559AccessList = 0x2
}

export class TransactionFactory {
  public tx: TypedTransaction;
  constructor(raw: Buffer, common: Common) {
    const [txData, extra] = decode(raw) as any as [
      TypedDatabaseTransaction,
      GanacheRawExtraTx
    ];
    this.tx = TransactionFactory.fromDatabaseTx(txData, common, extra);
  }
  private static _fromData(
    txData: Transaction | TypedDatabasePayload,
    txType: TransactionType,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    // if tx type envelope isn't available yet on this HF,
    // return legacy txs as is and convert typed txs to legacy
    if (!common.isActivatedEIP(2718)) {
      return LegacyTransaction.fromTxData(
        <LegacyDatabasePayload | Transaction>txData,
        common,
        extra
      );
    } else if (!common.isActivatedEIP(1559)) {
      if (txType === TransactionType.Legacy) {
        return LegacyTransaction.fromTxData(<Transaction>txData, common, extra);
      } else if (txType === TransactionType.EIP2930AccessList) {
        if (common.isActivatedEIP(2930)) {
          return EIP2930AccessListTransaction.fromTxData(
            <EIP2930AccessListDatabasePayload | Transaction>txData,
            common,
            extra
          );
        } else {
          // TODO: I believe this is unreachable with current architecture.
          // If 2718 is supported, so is 2930.
          // Issue: https://github.com/trufflesuite/ganache/issues/3487
          throw new CodedError(
            `EIP 2930 is not activated.`,
            JsonRpcErrorCode.INVALID_PARAMS
          );
        }
      } else if (txType === TransactionType.EIP1559AccessList) {
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
        if (txType === TransactionType.Legacy) {
          return LegacyTransaction.fromTxData(
            <LegacyDatabasePayload>txData,
            common,
            extra
          );
        } else if (txType === TransactionType.EIP2930AccessList) {
          return EIP2930AccessListTransaction.fromTxData(
            <EIP2930AccessListDatabasePayload>txData,
            common,
            extra
          );
        } else if (txType === TransactionType.EIP1559AccessList) {
          return EIP1559FeeMarketTransaction.fromTxData(
            <EIP1559FeeMarketDatabasePayload>txData,
            common,
            extra
          );
        }
      } else {
        const toEIP1559 =
          (txType === TransactionType.Legacy ||
            txType === TransactionType.EIP2930AccessList) &&
          txData.gasPrice === undefined;
        if (txType === TransactionType.EIP1559AccessList || toEIP1559) {
          const tx = EIP1559FeeMarketTransaction.fromTxData(
            txData,
            common,
            extra
          );
          if (toEIP1559) {
            // they didn't specify the type as eip-1559 (type 2), so we are
            // upgrading it. BUT, there's still a chance they sent us this data,
            // so we don't want to overwrite it.
            if (!txData.maxFeePerGas) {
              tx.maxFeePerGas = Quantity.from(null);
            }
            if (!txData.maxPriorityFeePerGas) {
              tx.maxPriorityFeePerGas = Quantity.Gwei;
            }
          }
          return tx;
        } else if (txType === TransactionType.Legacy) {
          return LegacyTransaction.fromTxData(txData, common, extra);
        } else if (txType === TransactionType.EIP2930AccessList) {
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
  public static fromRpc(
    txData: Transaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    const txType = this.typeOfRPC(txData);

    const tx = this._fromData(txData, txType, common, extra);
    assertValidTransactionSValue(common, tx);
    return tx;
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
    switch (txType) {
      case TransactionType.EIP1559AccessList:
        return EIP1559FeeMarketTransaction.fromTxData(
          txData.slice(1) as EIP1559FeeMarketDatabasePayload,
          common,
          extra
        );
      case TransactionType.Legacy:
        return LegacyTransaction.fromTxData(
          txData as LegacyDatabasePayload,
          common,
          extra
        );
      case TransactionType.EIP2930AccessList:
        return EIP2930AccessListTransaction.fromTxData(
          txData.slice(1) as EIP2930AccessListDatabasePayload,
          common,
          extra
        );
      default:
        throw new CodedError(
          `Transactions with supplied type ${txType} not supported`,
          JsonRpcErrorCode.METHOD_NOT_FOUND
        );
    }
  }
  /**
   * Create a transaction from a `txData` object
   *
   * When transaction types are activated (EIP 2718) the txData will be checked
   * for a transaction envelope (first byte < 192) before determining the
   * decoding strategy, otherwise it will be decoded as a Legacy Transaction. If
   * the transaction contains a transaction envelop, but EIP 2718 is not active
   * decoding will fail and an exception will be thrown.
   *
   * @param txData - The raw hex string transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
   * @param common - Options to pass on to the constructor of the transaction
   */
  public static fromString(txData: string, common: Common) {
    let data = Data.toBuffer(txData);
    const type = data[0];
    const txType = this.typeOf(type);
    let tx: TypedTransaction;
    if (common.isActivatedEIP(2718)) {
      let raw: TypedDatabasePayload;
      try {
        raw = decode<TypedDatabasePayload>(
          txType === TransactionType.Legacy ? data : data.slice(1)
        );
      } catch (e: any) {
        throw new Error("Could not decode transaction: " + e.message);
      }
      tx = this._fromData(raw, txType, common);
    } else {
      let raw: TypedDatabasePayload;
      try {
        raw = decode<LegacyDatabasePayload>(data);
      } catch (e: any) {
        throw new Error("Could not decode transaction: " + e.message);
      }
      tx = this._fromData(raw, TransactionType.Legacy, common);
    }

    assertValidTransactionSValue(common, tx);

    return tx;
  }

  private static typeOf(type: number) {
    if (
      type === TransactionType.EIP1559AccessList ||
      type === TransactionType.EIP2930AccessList
    ) {
      return type;
    } else {
      return TransactionType.Legacy;
    }
  }

  public static typeOfRaw(raw: TypedDatabaseTransaction) {
    // LegacyTransactions won't have the type up front to parse
    if (raw.length === 9) {
      return TransactionType.Legacy;
    }
    const type = raw[0][0];
    return this.typeOf(type);
  }

  public static typeOfRPC(rpc: Transaction) {
    if (!("type" in rpc) || rpc.type === undefined) {
      return TransactionType.Legacy;
    } else {
      // The type must be a hex value
      const txType = parseInt(rpc.type, 16);
      return this.typeOf(txType);
    }
  }
}
