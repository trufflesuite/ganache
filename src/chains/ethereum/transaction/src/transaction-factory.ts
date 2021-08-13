import {
  Data,
  Quantity,
  keccak,
  BUFFER_EMPTY,
  BUFFER_32_ZERO,
  RPCQUANTITY_EMPTY
} from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import type Common from "@ethereumjs/common";
import { BaseTransaction } from "./base-transaction";
import { PrefixedHexString } from "ethereumjs-util";
import { LegacyTransaction } from "./legacy-transaction";
import { EIP2930AccessListTransaction } from "./eip2930-access-list-transaction";
import { TypedRpcTransaction } from "./rpc-transaction";
import {
  EIP2930AccessListDatabasePayload,
  LegacyDatabasePayload,
  TypedDatabaseTransaction
} from "./raw";
import { TypedTransaction } from "./transaction-types";
import { decode } from "@ganache/rlp";

const MAX_UINT64 = 1n << (64n - 1n);

const UNTYPED_TX_START_BYTE = 0xc0; // all txs with first byte >= 0xc0 are untyped
const LEGACY_TX_TYPE_ID = 0x0;
const ACCESS_LIST_TX_TYPE_ID = 0x1;

export class TransactionFactory {
  /**
   * Create a transaction from a `txData` object
   *
   * @param txData - The rpc transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
   * @param common - Options to pass on to the constructor of the transaction
   */
  public static fromRpc(txData: TypedRpcTransaction, common: Common) {
    const txType = this.typeOfRPC(txData);
    if (txType === LegacyTransaction) {
      return LegacyTransaction.fromTxData(txData, common);
    } else if (txType === EIP2930AccessListTransaction) {
      return EIP2930AccessListTransaction.fromTxData(txData, common);
    } else {
      throw new Error(
        `Tx instantiation with supplied type ${
          "type" in txData ? txData.type : ""
        } not supported`
      );
    }
  }
  /**
   * Create a transaction from a `txData` object
   *
   * @param txData - The raw transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
   * @param common - Options to pass on to the constructor of the transaction
   */
  public static fromDatabaseTx(
    txData: TypedDatabaseTransaction,
    common: Common
  ) {
    const type = txData[0][0];
    const data = txData.slice(1, txData.length); // remove type because it's not rlp encoded and thus can't be decoded
    const txType = this.typeOf(type);
    if (txType === LegacyTransaction) {
      return LegacyTransaction.fromTxData(<LegacyDatabasePayload>data, common);
    } else if (txType === EIP2930AccessListTransaction) {
      return EIP2930AccessListTransaction.fromTxData(
        <EIP2930AccessListDatabasePayload>data,
        common
      );
    } else {
      throw new Error(`Tx instantiation with type ${type} not supported`);
    }
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
    if (txType === LegacyTransaction) {
      // type 0x0 toBuffer() is going to be empty, meaning
      // a type was sent. strip it away
      if (type === undefined) {
        data = data.slice(1, data.length);
      }
      const raw = decode<LegacyDatabasePayload>(data);
      return LegacyTransaction.fromTxData(<LegacyDatabasePayload>raw, common);
    } else {
      data = data.slice(1, data.length); // remove type because it's not rlp encoded and thus can't be decoded
      if (txType === EIP2930AccessListTransaction) {
        const raw = decode<EIP2930AccessListDatabasePayload>(data);
        return EIP2930AccessListTransaction.fromTxData(raw, common);
      } else {
        throw new Error(`Tx instantiation with type ${type} not supported`);
      }
    }
  }

  public static typeOf(type: number) {
    if (
      type >= UNTYPED_TX_START_BYTE ||
      type === LEGACY_TX_TYPE_ID ||
      type === undefined
    ) {
      return LegacyTransaction;
    } else if (type === ACCESS_LIST_TX_TYPE_ID) {
      return EIP2930AccessListTransaction;
    }
  }

  public static typeOfRaw(
    raw: TypedDatabaseTransaction | LegacyDatabasePayload
  ) {
    const type = raw[0][0]; // TODO this can be unsafe to pass to typeOf. What if the first value is nonce of 1? will look like a different tx
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
