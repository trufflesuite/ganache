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
import {
  EthereumRawAccessListTx,
  EthereumRawTx,
  TypedRawTransaction
} from "./raw";
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
      // 9 is the length of the legacy EthereumRawTx
      // if it's 9, there's no type. Otherwise, the first
      // item in the array is the type.
      if (txData.length === 9) {
        return LegacyTransaction.fromTxData(txData, common);
      } else {
      }
    } else {
      if (!("type" in txData) || txData.type === undefined) {
        // Assume legacy transaction
        return LegacyTransaction.fromTxData(txData, common);
      } else {
        const txType = parseInt(txData.type); // TODO
        if (txType === 0) {
          return LegacyTransaction.fromTxData(txData, common);
        } else if (txType === 1) {
          return AccessListTransaction.fromTxData(txData, common);
          // } else if (txType === 2) {
          //   return FeeMarketEIP1559Transaction.fromTxData(
          //     <FeeMarketEIP1559TxData>txData,
          //     txOptions
          //   );
        } else {
          throw new Error(`Tx instantiation with type ${txType} not supported`);
        }
      }
    }
  }
}
