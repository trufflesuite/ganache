import {
  RuntimeError,
  RETURN_TYPES,
  TransactionLog
} from "@ganache/ethereum-utils";
import {
  Data,
  Quantity,
  keccak,
  RPCQUANTITY_ONE,
  BUFFER_ZERO,
  RPCQUANTITY_EMPTY,
  BUFFER_EMPTY
} from "@ganache/utils";
import { RpcTransaction } from "./rpc-transaction";
import { ecsign } from "ethereumjs-util";
import type Common from "@ethereumjs/common";
import { EthereumRawTx, GanacheRawExtraTx } from "./raw";
import type { RunTxResult } from "@ethereumjs/vm/dist/runTx";
import { computeIntrinsics } from "./signing";
import { encodeRange, digest, EncodedPart, encode } from "@ganache/rlp";
import { BaseTransaction } from "./base-transaction";
import { TransactionReceipt } from "./transaction-receipt";
import { Address } from "@ganache/ethereum-address";

export const toValidLengthAddress = (address: string, fieldName: string) => {
  const buffer = Data.from(address).toBuffer();
  if (buffer.byteLength !== Address.ByteLength) {
    throw new Error(
      `The field ${fieldName} must have byte length of ${Address.ByteLength}`
    );
  }
  return Address.from(buffer);
};

export const hasPartialSignature = (
  data: RpcTransaction
): data is RpcTransaction & {
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

const ONE_BUFFER = RPCQUANTITY_ONE.toBuffer();

/**
 * A RuntimeTransaction can be changed; its hash is not finalized and it is not
 * yet part of a block.
 */

export class RuntimeTransaction extends BaseTransaction {
  public hash: Data | null;
  /**
   * used by the miner to mark if this transaction is eligible for reordering or
   * removal
   */
  public locked: boolean = false;

  public logs: TransactionLog[];
  public receipt: TransactionReceipt;
  public execException: RuntimeError;

  public raw: EthereumRawTx | null;
  public serialized: Buffer;
  public encodedData: EncodedPart;
  public encodedSignature: EncodedPart;
  private finalizer: (eventData: TransactionFinalization) => void;
  private finalized: Promise<TransactionFinalization>;

  constructor(data: EthereumRawTx | RpcTransaction, common: Common) {
    super(common);
    let finalizer: (value: TransactionFinalization) => void;
    this.finalized = new Promise<TransactionFinalization>(resolve => {
      finalizer = (...args: any[]) => process.nextTick(resolve, ...args);
    });
    this.finalizer = finalizer;

    if (Array.isArray(data)) {
      // handle raw data (sendRawTransaction)
      this.nonce = Quantity.from(data[0], true);
      this.gasPrice = Quantity.from(data[1]);
      this.gas = Quantity.from(data[2]);
      this.to = data[3].length == 0 ? RPCQUANTITY_EMPTY : Address.from(data[3]);
      this.value = Quantity.from(data[4]);
      this.data = Data.from(data[5]);
      this.v = Quantity.from(data[6]);
      this.r = Quantity.from(data[7]);
      this.s = Quantity.from(data[8]);

      const {
        from,
        serialized,
        hash,
        encodedData,
        encodedSignature
      } = computeIntrinsics(this.v, data, this.common.chainId());

      this.from = from;
      this.raw = data;
      this.serialized = serialized;
      this.hash = hash;
      this.encodedData = encodedData;
      this.encodedSignature = encodedSignature;
    } else {
      // handle JSON
      this.nonce = Quantity.from(data.nonce, true);
      this.gasPrice = Quantity.from(data.gasPrice);
      this.gas = Quantity.from(data.gas == null ? data.gasLimit : data.gas);
      this.to =
        data.to == null
          ? RPCQUANTITY_EMPTY
          : toValidLengthAddress(data.to, "to");
      this.value = Quantity.from(data.value);
      this.data = Data.from(data.data == null ? data.input : data.data);

      // If we have v, r, or s validate and use them
      if (hasPartialSignature(data)) {
        if (data.v == null || data.r == null || data.s == null) {
          throw new Error(
            "Transaction signature is incomplete; v, r, and s are required."
          );
        }

        // if we have a signature the `nonce` field is required
        if (data.nonce == null) {
          throw new Error(
            "Signed transaction is incomplete; nonce is required."
          );
        }

        this.v = Quantity.from(data.v, true);
        this.r = Quantity.from(data.r, true);
        this.s = Quantity.from(data.s, true);

        // compute the `hash` and the `from` address
        const raw: EthereumRawTx = [
          this.nonce.toBuffer(),
          this.gasPrice.toBuffer(),
          this.gas.toBuffer(),
          this.to.toBuffer(),
          this.value.toBuffer(),
          this.data.toBuffer(),
          this.v.toBuffer(),
          this.r.toBuffer(),
          this.s.toBuffer()
        ];
        const {
          from,
          serialized,
          hash,
          encodedData,
          encodedSignature
        } = computeIntrinsics(this.v, raw, this.common.chainId());

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
        this.raw = raw;
        this.serialized = serialized;
        this.hash = hash;
        this.encodedData = encodedData;
        this.encodedSignature = encodedSignature;
      } else if (data.from != null) {
        // we don't have a signature yet, so we just need to record the `from`
        // address for now. The TransactionPool will fill in the `hash` and
        // `raw` fields during signing
        this.from = toValidLengthAddress(data.from, "from");
      }
    }
  }

  /**
   * sign a transaction with a given private key, then compute and set the `hash`.
   *
   * @param privateKey - Must be 32 bytes in length
   */
  public signAndHash(privateKey: Buffer) {
    if (this.v != null) {
      throw new Error(
        "Internal Error: RuntimeTransaction `sign` called but transaction has already been signed"
      );
    }

    const chainId = this.common.chainId();
    const raw: EthereumRawTx = [
      this.nonce.toBuffer(),
      this.gasPrice.toBuffer(),
      this.gas.toBuffer(),
      this.to.toBuffer(),
      this.value.toBuffer(),
      this.data.toBuffer(),
      Quantity.from(chainId).toBuffer(),
      BUFFER_EMPTY,
      BUFFER_EMPTY
    ];
    const data = encodeRange(raw, 0, 6);
    const dataLength = data.length;

    const ending = encodeRange(raw, 6, 3);
    const msgHash = keccak(
      digest([data.output, ending.output], dataLength + ending.length)
    );
    const sig = ecsign(msgHash, privateKey, chainId);
    this.v = Quantity.from(sig.v);
    this.r = Quantity.from(sig.r);
    this.s = Quantity.from(sig.s);

    raw[6] = this.v.toBuffer();
    raw[7] = this.r.toBuffer();
    raw[8] = this.s.toBuffer();

    this.raw = raw;
    const encodedSignature = encodeRange(raw, 6, 3);
    this.serialized = digest(
      [data.output, encodedSignature.output],
      dataLength + encodedSignature.length
    );
    this.hash = Data.from(keccak(this.serialized));
    this.encodedData = data;
    this.encodedSignature = encodedSignature;
  }

  public serializeForDb(
    blockHash: Data,
    blockNumber: Quantity,
    transactionIndex: Quantity
  ): Buffer {
    // todo(perf):make this work with encodeRange and digest
    const txAndExtraData: [EthereumRawTx, GanacheRawExtraTx] = [
      this.raw,
      [
        this.from.toBuffer(),
        this.hash.toBuffer(),
        blockHash.toBuffer(),
        blockNumber.toBuffer(),
        transactionIndex.toBuffer()
      ]
    ];
    return encode(txAndExtraData);
  }

  public toJSON = () => {
    return {
      hash: this.hash,
      nonce: this.nonce,
      blockHash: null,
      blockNumber: null,
      transactionIndex: null,
      from: this.from,
      to: this.to.isNull() ? null : this.to,
      value: this.value,
      gas: this.gas,
      gasPrice: this.gasPrice,
      input: this.data,
      v: this.v,
      r: this.r,
      s: this.s
    };
  };

  /**
   * Initializes the receipt and logs
   * @param result
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

    const receipt = (this.receipt = TransactionReceipt.fromValues(
      status,
      Quantity.from(cumulativeGasUsed).toBuffer(),
      result.bloom.bitvector,
      (this.logs = vmResult.logs || ([] as TransactionLog[])),
      result.gasUsed.toArrayLike(Buffer),
      result.createdAddress ? result.createdAddress.buf : null
    ));

    return receipt.serialize(false);
  }

  public getReceipt(): TransactionReceipt {
    return this.receipt;
  }

  public getLogs(): TransactionLog[] {
    return this.logs;
  }

  /**
   * Returns a Promise that is resolved with the confirmation status and, if
   * appropriate, an error property.
   *
   * Note: it is possible to be confirmed AND have an error
   *
   * @param event "finalized"
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
   * @param status
   * @param error
   */
  public finalize(status: "confirmed" | "rejected", error: Error = null): void {
    // resolves the `#finalized` promise
    this.finalizer({ status, error });
  }
}
