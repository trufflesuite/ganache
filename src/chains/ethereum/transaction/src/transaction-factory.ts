import { utils, Data, Quantity } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import type Common from "@ethereumjs/common";
import { BaseTransaction } from "./base-transaction";
import { BN } from "ethereumjs-util";
import { Hardfork } from "./hardfork";
import { Params } from "./params";
import { RuntimeTransaction } from "./runtime-transaction";
import { LegacyTransaction } from "./legacy-transaction";
import { AccessListTransaction } from "./access-list-transaction";
import { TypedRpcTransaction } from "./rpc-transaction";
import { RawAccessListTx, RawLegacyTx, TypedRawTransaction } from "./raw";
import { TypedTransaction } from "./transaction-types";

const { BUFFER_EMPTY, BUFFER_32_ZERO } = utils;

const MAX_UINT64 = 1n << (64n - 1n);

export class TransactionFactory {
  /**
   * Create a transaction from a `txData` object
   *
   * @param txData - The transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
   * @param common - Options to pass on to the constructor of the transaction
   */
  public static fromTxData(
    txData: TypedRpcTransaction | TypedRawTransaction,
    common: Common
  ): TypedTransaction {
    if (Array.isArray(txData)) {
      const txType = this.typeOfRaw(txData);
      if (txType === LegacyTransaction) {
        return LegacyTransaction.fromTxData(<RawLegacyTx>txData, common);
      } else if (txType === AccessListTransaction) {
        return AccessListTransaction.fromTxData(
          <RawAccessListTx>txData,
          common
        );
      } else {
        throw new Error(`Tx instantiation with supplied type not supported`);
      }
    } else {
      const txType = this.typeOfRPC(txData);
      if (txType === LegacyTransaction) {
        return LegacyTransaction.fromTxData(txData, common);
      } else if (txType === AccessListTransaction) {
        return AccessListTransaction.fromTxData(txData, common);
      } else {
        throw new Error(
          `Tx instantiation with type ${txData.type} not supported`
        );
      }
    }
  }
  public static typeOfRaw(raw: TypedRawTransaction) {
    // 9 is the length of the legacy EthereumRawTx
    // if it's 9, there's no type. Otherwise, the first
    // item in the array is the type.
    if (raw.length === 9) {
      return LegacyTransaction;
    } else {
      const first = raw[0];
      let txType;
      if (first.length > 0) {
        txType = first.readInt8(0);
      } else {
        // a tx type of 0x0 stored as a buffer will just be empty
        return LegacyTransaction;
      }
      if (txType === 1) {
        return AccessListTransaction;
      }
    }
  }
  public static typeOfRPC(rpc: TypedRpcTransaction) {
    if (!("type" in rpc) || rpc.type === undefined) {
      // Assume legacy transaction
      return LegacyTransaction;
    } else {
      const txType = parseInt(rpc.type); // TODO
      if (txType === 0) {
        return LegacyTransaction;
      } else if (txType === 1) {
        return AccessListTransaction;
      }
    }
  }
  public static txIncludesType(tx: TypedRpcTransaction | TypedRawTransaction) {
    if (Array.isArray(tx)) {
      if (tx.length === 9) {
        return false;
      } else return true;
    } else {
      if (!("type" in tx) || tx.type === undefined) {
        return false;
      } else {
        return true;
      }
    }
  }
}
