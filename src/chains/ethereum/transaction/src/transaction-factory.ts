import { utils, Data, Quantity } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import type Common from "@ethereumjs/common";
import { BaseTransaction } from "./base-transaction";
import { PrefixedHexString } from "ethereumjs-util";
import { LegacyTransaction } from "./legacy-transaction";
import { AccessListTransaction } from "./access-list-transaction";
import { TypedRpcTransaction } from "./rpc-transaction";
import { RawAccessListTx, RawLegacyTx, TypedRawTransaction } from "./raw";
import { TypedTransaction } from "./transaction-types";
import { decode } from "@ganache/rlp";

const MAX_UINT64 = 1n << (64n - 1n);

const UNTYPED_TX_START_BYTE = parseInt("0xc0"); // all txs with first byte >= 0xc0 are untyped
const LEGACY_TX_TYPE_ID = parseInt("0x0");
const ACCESS_LIST_TX_TYPE_ID = parseInt("0x1");

export class TransactionFactory {
  /**
   * Create a transaction from a `txData` object
   *
   * @param txData - The transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
   * @param common - Options to pass on to the constructor of the transaction
   */
  public static fromTxData(
    txData: TypedRpcTransaction | TypedRawTransaction | PrefixedHexString,
    common: Common
  ): TypedTransaction {
    if (typeof txData === "string") {
      let data = Data.from(txData).toBuffer();
      const txType = this.typeOfString(txData);
      if (txType === LegacyTransaction) {
        const raw = decode<RawLegacyTx>(data);
        return LegacyTransaction.fromTxData(raw, common);
      } else if (txType === AccessListTransaction) {
        const typeBuf = data.slice(0, 1); // the type is not rlp encoded, so it shouldn't be fed to our rlp decoder
        data = data.slice(1, data.length);
        const raw = decode<RawAccessListTx>(data);
        raw.splice(0, 0, typeBuf); // now put our type back to the front of the list
        return AccessListTransaction.fromTxData(raw, common);
      } else {
        throw new Error(`Tx instantiation with supplied type not supported`);
      }
    } else if (Array.isArray(txData)) {
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

  public static typeOfString(str: PrefixedHexString) {
    const firstByte = parseInt(str.substr(0, 4));
    if (firstByte >= UNTYPED_TX_START_BYTE || firstByte === LEGACY_TX_TYPE_ID) {
      return LegacyTransaction;
    } else if (firstByte === ACCESS_LIST_TX_TYPE_ID) {
      return AccessListTransaction;
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
