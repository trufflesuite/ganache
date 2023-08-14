import {
  RuntimeError,
  RETURN_TYPES,
  TransactionLog
} from "@ganache/ethereum-utils";
import { Data, Quantity, BUFFER_ZERO } from "@ganache/utils";
import { Transaction } from "./rpc-transaction";
import type { Common } from "@ethereumjs/common";
import { GanacheRawExtraTx, TypedRawTransaction } from "./raw";
import type { RunTxResult } from "@ethereumjs/vm";
import { BaseTransaction } from "./base-transaction";
import { InternalTransactionReceipt } from "./transaction-receipt";
import { Address } from "@ganache/ethereum-address";

export const toValidLengthAddress = (address: string, fieldName: string) => {
  const buffer = Data.toBuffer(address);
  if (buffer.byteLength !== Address.ByteLength) {
    throw new Error(
      `The field ${fieldName} must have byte length of ${Address.ByteLength}`
    );
  }
  return Address.from(buffer);
};

export const hasPartialSignature = (
  data: Transaction
): data is Transaction & {
  from?: string;
  v?: string;
  r?: string;
  s?: string;
} => {
  return data["v"] != null || data["r"] != null || data["s"] != null;
};

type TransactionFinalization =
  | { status: "confirmed"; error?: Error }
  | { status: "rejected"; error: Error };

const ONE_BUFFER = Quantity.One.toBuffer();

/**
 * A RuntimeTransaction can be changed; its hash is not finalized and it is not
 * yet part of a block.
 */

export abstract class RuntimeTransaction extends BaseTransaction {
  public declare hash: Data | null;
  /**
   * used by the miner to mark if this transaction is eligible for reordering or
   * removal
   */
  public locked: boolean = false;

  public logs: TransactionLog[];
  public receipt: InternalTransactionReceipt;
  public execException: RuntimeError;

  public raw: TypedRawTransaction;
  public serialized: Buffer;
  private finalizer: (eventData: TransactionFinalization) => void;
  private finalized: Promise<TransactionFinalization>;

  constructor(
    data: TypedRawTransaction | Transaction,
    common: Common,
    extra?: GanacheRawExtraTx
  ) {
    super(common, extra);
    let finalizer: (value: TransactionFinalization) => void;
    this.finalized = new Promise<TransactionFinalization>(resolve => {
      finalizer = (...args: any[]) => process.nextTick(resolve, ...args);
    });
    this.finalizer = finalizer;

    if (!Array.isArray(data)) {
      // handle JSON
      this.nonce = Quantity.from(data.nonce, true);
      this.gas = Quantity.from(data.gas == null ? data.gasLimit : data.gas);
      this.to = data.to == null ? null : toValidLengthAddress(data.to, "to");
      this.value = Quantity.from(data.value || 0);
      const dataVal =
        data.data == null
          ? data.input == null
            ? "0x"
            : data.input
          : data.data;
      this.data = Data.from(dataVal);
    }
  }

  /**
   * sign a transaction with a given private key, then compute and set the `hash`.
   *
   * @param privateKey - Must be 32 bytes in length
   */
  protected abstract signAndHash(privateKey: Buffer);

  abstract toJSON(common: Common);

  /**
   * Initializes the receipt and logs
   * @param result -
   * @returns RLP encoded data for use in a transaction trie
   */
  public fillFromResult(result: RunTxResult, cumulativeGasUsed: bigint) {
    const vmResult = result.execResult;
    const execException = vmResult.exceptionError;
    let status: Buffer;
    if (execException) {
      status = BUFFER_ZERO;
      this.execException = new RuntimeError(
        this.hash,
        result,
        RETURN_TYPES.TRANSACTION_HASH
      );
    } else {
      status = ONE_BUFFER;
    }

    const receipt = (this.receipt = InternalTransactionReceipt.fromValues(
      status,
      Quantity.toBuffer(cumulativeGasUsed),
      result.bloom.bitvector,
      (this.logs = vmResult.logs || ([] as TransactionLog[])),
      Quantity.toBuffer(result.totalGasSpent),
      result.createdAddress ? result.createdAddress.buf : null,
      this.type
    ));
    return receipt.serialize(false);
  }

  public getReceipt(): InternalTransactionReceipt {
    return this.receipt;
  }

  public getLogs(): TransactionLog[] {
    return this.logs;
  }

  validateAndSetSignature = (data: Transaction) => {
    // If we have v, r, or s validate and use them
    if (hasPartialSignature(data)) {
      if (data.v == null || data.r == null || data.s == null) {
        throw new Error(
          "Transaction signature is incomplete; v, r, and s are required."
        );
      }

      // if we have a signature the `nonce` field is required
      if (data.nonce == null) {
        throw new Error("Signed transaction is incomplete; nonce is required.");
      }

      this.v = Quantity.from(data.v, true);
      this.r = Quantity.from(data.r, true);
      this.s = Quantity.from(data.s, true);

      // compute the `hash` and the `from` address
      const raw: TypedRawTransaction = this.toEthRawTransaction(
        this.v.toBuffer(),
        this.r.toBuffer(),
        this.s.toBuffer()
      );
      this.raw = raw;
      if (!this.from) {
        const { from, serialized, hash } = this.computeIntrinsics(
          this.v,
          raw,
          this.common.chainId()
        );

        // if the user specified a `from` address in addition to the  `v`, `r`,
        //  and `s` values, make sure the `from` address matches
        if (data.from !== null) {
          const userFrom = toValidLengthAddress(data.from, "from");
          if (!from.toBuffer().equals(userFrom.toBuffer())) {
            throw new Error(
              "Transaction is signed and contains a `from` field, but the signature doesn't match."
            );
          }
        }
        this.from = from;
        this.serialized = serialized;
        this.hash = hash;
      }
    } else if (data.from != null) {
      // we don't have a signature yet, so we just need to record the `from`
      // address for now. The TransactionPool will fill in the `hash` and
      // `raw` fields during signing
      this.from = toValidLengthAddress(data.from, "from");
    }
  };

  /**
   * Returns a Promise that is resolved with the confirmation status and, if
   * appropriate, an error property.
   *
   * Note: it is possible to be confirmed AND have an error
   *
   * @param _event - "finalized"
   */
  public once(_event: "finalized") {
    return this.finalized;
  }

  /**
   * Mark this transaction as finalized, notifying all past and future
   * "finalized" event subscribers.
   *
   * Note:
   *
   * @param status -
   * @param error -
   */
  public finalize(status: "confirmed" | "rejected", error: Error = null): void {
    // resolves the `#finalized` promise
    this.finalizer({ status, error });
  }
  protected abstract toEthRawTransaction(
    v: Buffer,
    r: Buffer,
    s: Buffer
  ): TypedRawTransaction;

  protected abstract computeIntrinsics(
    v: Quantity,
    raw: TypedRawTransaction,
    chainId: bigint
  );

  protected abstract toVmTransaction();
  protected abstract updateEffectiveGasPrice(baseFeePerGas: bigint);
}
