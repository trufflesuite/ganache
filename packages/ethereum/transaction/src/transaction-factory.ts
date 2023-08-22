import { Data, JsonRpcErrorCode, Quantity } from "@ganache/utils";
import type { Common } from "@ethereumjs/common";
import { LegacyTransaction } from "./legacy-transaction";
import { EIP2930AccessListTransaction } from "./eip2930-access-list-transaction";
import {
  EIP1559FeeMarketRpcTransaction,
  EIP2930AccessListRpcTransaction,
  Transaction,
  TransactionType
} from "./rpc-transaction";
import {
  EIP1559FeeMarketRawTransaction,
  EIP2930AccessListRawTransaction,
  GanacheRawExtraTx,
  LegacyRawTransaction,
  TypedRawTransaction,
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

export class TransactionFactory {
  public tx: TypedTransaction;
  constructor(raw: Buffer, common: Common) {
    const [txData, extra] = decode(raw) as any as [
      TypedDatabaseTransaction,
      GanacheRawExtraTx
    ];
    this.tx = TransactionFactory.fromDatabaseTx(txData, common, extra);
  }

  /**
   * Validates the txType against active hardforks and EIPs. May
   * coerce transactions to a transaction type that differs from the specified
   * txType. For example, if the txType is EIP2930AccessList but the hardfork
   * is before EIP-2930 is activated, the txType will be coerced to Legacy.
   *
   * @param txData
   * @param txType
   * @param common
   * @param extra
   * @returns
   */
  private static _fromUnsafeUserData(
    txData: Transaction | TypedRawTransaction,
    txType: TransactionType,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    // if tx type envelope isn't available yet on this HF,
    // return legacy txs as is and convert typed txs to legacy
    if (!common.isActivatedEIP(2718)) {
      return LegacyTransaction.fromTxData(
        <LegacyRawTransaction | Transaction>txData,
        common,
        extra
      );
    } else if (!common.isActivatedEIP(1559)) {
      if (txType === TransactionType.Legacy) {
        return LegacyTransaction.fromTxData(<Transaction>txData, common, extra);
      } else if (txType === TransactionType.EIP2930AccessList) {
        if (common.isActivatedEIP(2930)) {
          return EIP2930AccessListTransaction.fromTxData(
            <EIP2930AccessListRawTransaction | EIP2930AccessListRpcTransaction>(
              txData
            ),
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
            <LegacyRawTransaction>txData,
            common,
            extra
          );
        } else if (txType === TransactionType.EIP2930AccessList) {
          return EIP2930AccessListTransaction.fromTxData(
            <EIP2930AccessListRawTransaction>txData,
            common,
            extra
          );
        } else if (txType === TransactionType.EIP1559AccessList) {
          return EIP1559FeeMarketTransaction.fromTxData(
            <EIP1559FeeMarketRawTransaction>txData,
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
            <EIP1559FeeMarketRpcTransaction>txData,
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
              <EIP2930AccessListRpcTransaction>txData,
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

    const tx = this._fromUnsafeUserData(txData, txType, common, extra);
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
          txData.slice(1) as EIP1559FeeMarketRawTransaction,
          common,
          extra
        );
      case TransactionType.Legacy:
        return LegacyTransaction.fromTxData(
          txData as LegacyRawTransaction,
          common,
          extra
        );
      case TransactionType.EIP2930AccessList:
        return EIP2930AccessListTransaction.fromTxData(
          txData.slice(1) as EIP2930AccessListRawTransaction,
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
   * Create a transaction from a `txData` object without the type field in the first position (for type 1 and 2 txs)
   *
   * This method should only be used with "safe" data that doesn't need to be validated against the active hardforks or
   * EIPs. In other words: it should come from a fork, or from the database.
   *
   * @tparam txTYpe - The type of txData. Throws if the the type is not supported.
   * @param txData - The raw transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
   * @param common - Options to pass on to the constructor of the transaction
   * @param extra
   */
  public static fromSafeTypeAndTxData(
    txType: TransactionType,
    txData: TypedRawTransaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    switch (txType) {
      case TransactionType.EIP1559AccessList:
        return EIP1559FeeMarketTransaction.fromTxData(
          txData as EIP1559FeeMarketRawTransaction,
          common,
          extra
        );
      case TransactionType.Legacy:
        return LegacyTransaction.fromTxData(
          txData as LegacyRawTransaction,
          common,
          extra
        );
      case TransactionType.EIP2930AccessList:
        return EIP2930AccessListTransaction.fromTxData(
          txData as EIP2930AccessListRawTransaction,
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
      let raw: TypedRawTransaction;
      try {
        raw = decode<TypedRawTransaction>(
          txType === TransactionType.Legacy ? data : data.slice(1)
        );
      } catch (e: any) {
        throw new Error("Could not decode transaction: " + e.message);
      }
      tx = this._fromUnsafeUserData(raw, txType, common);
    } else {
      let raw: TypedRawTransaction;
      try {
        raw = decode<LegacyRawTransaction>(data);
      } catch (e: any) {
        throw new Error("Could not decode transaction: " + e.message);
      }
      tx = this._fromUnsafeUserData(raw, TransactionType.Legacy, common);
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

  /**
   * Pulls the type out of the raw transaction data, which is the first byte of
   * the raw data, unless the data is a legacy transaction (raw.length === 9),
   * in which case the type is `0`.
   *
   * This does not validate the type, it just returns it.
   *
   * @param raw
   * @returns
   */
  private static typeOfRaw(raw: TypedDatabaseTransaction) {
    // LegacyTransactions won't have the type up front to parse
    if (raw.length === 9) {
      return TransactionType.Legacy;
    }
    return raw[0][0];
  }

  private static typeOfRPC(rpc: Transaction) {
    if (!("type" in rpc) || rpc.type === undefined) {
      return TransactionType.Legacy;
    } else {
      // The type must be a hex value
      const txType = parseInt(rpc.type, 16);
      return this.typeOf(txType);
    }
  }
}
