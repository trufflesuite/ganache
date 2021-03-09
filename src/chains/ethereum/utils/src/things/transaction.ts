import { encode as rlpEncode, decode as rlpDecode } from "rlp";
import { params } from "./params";
import { Data, Quantity } from "@ganache/utils";
import { utils } from "@ganache/utils";
import { Address } from "./address";
import { RpcTransaction } from "./transaction/rpc-transaction";
import { BN, ecsign } from "ethereumjs-util";
import { Hardfork } from "../types/hardfork";
import Common from "ethereumjs-common";
import {
  BlockRawTx,
  EthereumRawTx,
  GanacheRawExtraTx
} from "./transaction/raw";
import { RunTxResult } from "ethereumjs-vm/dist/runTx";
import { RETURN_TYPES, RuntimeError } from "../errors/runtime-error";
import { TransactionReceipt } from "./transaction-receipt";
import { TransactionLog } from "./blocklogs";
import { computeHash, computeInstrinsics } from "./transaction/signing";

type TransactionFinalization =
  | { status: "confirmed"; error?: Error }
  | { status: "rejected"; error: Error };

export * from "./transaction/raw";
export * from "./transaction/vm-transaction";

const {
  keccak,
  BUFFER_ZERO,
  RPCQUANTITY_ONE,
  BUFFER_EMPTY,
  RPCQUANTITY_EMPTY
} = utils;
const ONE_BUFFER = RPCQUANTITY_ONE.toBuffer();
const MAX_UINT64 = 1n << (64n - 1n);

/**
 * Compute the 'intrinsic gas' for a message with the given data.
 * @param data The transaction's data
 * @param hardfork The hardfork use to determine gas costs
 * @returns The absolute minimum amount of gas this transaction will consume,
 * or `-1` if the data in invalid (gas consumption would exceed `MAX_UINT64`
 * (`(2n ** 64n) - 1n`).
 */
export const calculateIntrinsicGas = (data: Data, common: Common) => {
  const hardfork = common.hardfork() as Hardfork;
  // Set the starting gas for the raw transaction
  let gas = params.TRANSACTION_GAS;
  if (data) {
    const input = data.toBuffer();
    // Bump the required gas by the amount of transactional data
    const dataLength = input.byteLength;
    if (dataLength > 0) {
      const TRANSACTION_DATA_NON_ZERO_GAS = params.TRANSACTION_DATA_NON_ZERO_GAS.get(
        hardfork
      );
      const TRANSACTION_DATA_ZERO_GAS = params.TRANSACTION_DATA_ZERO_GAS;

      // Zero and non-zero bytes are priced differently
      let nonZeroBytes: bigint = 0n;
      for (const b of input) {
        if (b !== 0) {
          nonZeroBytes++;
        }
      }

      // Make sure we don't exceed uint64 for all data combinations.
      // TODO: make sure these upper-bound checks are safe to remove, then
      // remove if so.
      // NOTE: This is an upper-bounds limit ported from geth that doesn't
      // make sense for Ethereum, as exceeding the upper bound would require
      // something like 200+ Petabytes of data.
      // https://github.com/ethereum/go-ethereum/blob/cf856ea1ad96ac39ea477087822479b63417036a/core/state_transition.go#L106-L141
      //
      // explanation:
      // `(MAX_UINT64 - gas) / TRANSACTION_DATA_NON_ZERO_GAS` is the maximum
      // number of "non-zero bytes" geth can handle.
      if ((MAX_UINT64 - gas) / TRANSACTION_DATA_NON_ZERO_GAS < nonZeroBytes) {
        return -1n;
      }
      gas += nonZeroBytes * TRANSACTION_DATA_NON_ZERO_GAS;

      const zeroBytes = BigInt(dataLength) - nonZeroBytes;
      // explanation:
      // `(MAX_UINT64 - gas) / TRANSACTION_DATA_ZERO_GAS` is the maximum number
      // of "zero bytes" geth can handle after subtracting out the cost of
      // the "non-zero bytes"
      if ((MAX_UINT64 - gas) / TRANSACTION_DATA_ZERO_GAS < zeroBytes) {
        return -1n;
      }
      gas += zeroBytes * TRANSACTION_DATA_ZERO_GAS;
    }
  }
  return gas;
};

const toValidLengthAddress = (address: string, fieldName: string) => {
  const buffer = Data.from(address).toBuffer();
  if (buffer.byteLength !== Address.ByteLength) {
    throw new Error(
      `The field ${fieldName} must have byte length of ${Address.ByteLength}`
    );
  }
  return Address.from(buffer);
};

const hasPartialSignature = (
  data: RpcTransaction
): data is RpcTransaction & {
  from?: string;
  v?: string;
  r?: string;
  s?: string;
} => {
  return data["v"] != null || data["r"] != null || data["s"] != null;
};
export class BaseTransaction {
  public nonce: Quantity;
  public gasPrice: Quantity;
  public gas: Quantity;
  public to: Address | null;
  public value: Quantity;
  public data: Data;
  public v: Quantity | null;
  public r: Quantity | null;
  public s: Quantity | null;

  public from: Data | null;

  public common: Common;

  constructor(common: Common) {
    this.common = common;
  }

  public toVmTransaction() {
    const sender = this.from.toBuffer();
    const to = this.to.toBuffer();
    const data = this.data.toBuffer();
    return {
      nonce: new BN(this.nonce.toBuffer()),
      gasPrice: new BN(this.gasPrice.toBuffer()),
      gasLimit: new BN(this.gas.toBuffer()),
      to,
      value: new BN(this.value.toBuffer()),
      data,
      getSenderAddress: () => sender,
      /**
       * the minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
       */
      getBaseFee: () => {
        let fee = this.calculateIntrinsicGas();
        if (to.equals(BUFFER_EMPTY)) {
          fee += params.TRANSACTION_CREATION;
        }
        return new BN(Quantity.from(fee).toBuffer());
      },
      getUpfrontCost: () => {
        const { gas, gasPrice, value } = this;
        try {
          const c = gas.toBigInt() * gasPrice.toBigInt() + value.toBigInt();
          return new BN(Quantity.from(c).toBuffer());
        } catch (e) {
          throw e;
        }
      }
    };
  }
  public calculateIntrinsicGas() {
    return calculateIntrinsicGas(this.data, this.common);
  }
  public toJSON: () => any;
}

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
      // handle raw data (sendRawTranasction)
      this.nonce = Quantity.from(data[0], true);
      this.gasPrice = Quantity.from(data[1]);
      this.gas = Quantity.from(data[2]);
      this.to = data[3].length == 0 ? RPCQUANTITY_EMPTY : Address.from(data[3]);
      this.value = Quantity.from(data[4]);
      this.data = Data.from(data[5]);
      this.v = Quantity.from(data[6]);
      this.r = Quantity.from(data[7]);
      this.s = Quantity.from(data[8]);

      const { from, hash } = computeInstrinsics(
        this.v,
        data,
        this.common.chainId()
      );
      this.from = from;
      this.hash = hash;
      this.raw = data;
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
        const { hash, from } = computeInstrinsics(
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
        this.hash = hash;
        this.raw = raw;
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
    const msgHash = keccak(rlpEncode(raw));
    const sig = ecsign(msgHash, privateKey, chainId);
    this.v = Quantity.from(sig.v);
    this.r = Quantity.from(sig.r);
    this.s = Quantity.from(sig.s);

    raw[6] = this.v.toBuffer();
    raw[7] = this.r.toBuffer();
    raw[8] = this.s.toBuffer();

    this.hash = computeHash(raw);
    this.raw = raw;
  }

  public serialize(): Buffer {
    if (this.raw == null) {
      throw new Error(
        "Internal Error: `serialize` called on `RuntimeTransaction` but transaction hasn't been signed"
      );
    }
    return rlpEncode(this.raw);
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
      result.createdAddress,
      result.gasUsed.toArrayLike(Buffer)
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

/**
 * A FakeTransaction spoofs the from address and signature.
 */
export class FakeTransaction extends RuntimeTransaction {
  constructor(data: RpcTransaction, common: Common) {
    super(data, common);

    if (this.from == null) {
      throw new Error(
        "Internal Error: FakeTransaction initialized without a `from` field."
      );
    }
  }
}

/**
 * A frozen tranasction is a transaction that is part of a block.
 */
export class FrozenTransaction extends BaseTransaction {
  public nonce: Quantity;
  public gasPrice: Quantity;
  public gas: Quantity;
  public to: Address | null;
  public value: Quantity;
  public data: Data;
  public v: Quantity;
  public r: Quantity;
  public s: Quantity;

  // from, index, hash, blockNumber, and blockHash are extra data we store to
  // support account mascarading, quick receipts:
  // public from: Address;
  public index: Quantity;
  public hash: Data;
  public blockNumber: Quantity;
  public blockHash: Data;

  public common: Common;

  constructor(
    data: Buffer | [EthereumRawTx, GanacheRawExtraTx],
    common: Common
  ) {
    super(common);

    if (Buffer.isBuffer(data)) {
      const decoded = (rlpDecode(data) as any) as [
        EthereumRawTx,
        GanacheRawExtraTx
      ];

      this.setRaw(decoded[0]);
      this.setExtra(decoded[1]);
    } else {
      this.setRaw(data[0]);
      this.setExtra(data[1]);
    }
    Object.freeze(this);
  }

  public setRaw(raw: EthereumRawTx) {
    const [nonce, gasPrice, gasLimit, to, value, data, v, r, s] = raw;

    this.nonce = Quantity.from(nonce);
    this.gasPrice = Quantity.from(gasPrice);
    this.gas = Quantity.from(gasLimit);
    this.to = to.length === 0 ? RPCQUANTITY_EMPTY : Address.from(to);
    this.value = Quantity.from(value);
    this.data = Data.from(data);
    this.v = Quantity.from(v, true);
    this.r = Quantity.from(r, true);
    this.s = Quantity.from(s, true);
  }

  public setExtra(raw: GanacheRawExtraTx) {
    const [from, hash, blockHash, blockNumber, index] = raw;

    this.from = Address.from(from);
    this.hash = Data.from(hash, 32);
    this.blockHash = Data.from(blockHash, 32);
    this.blockNumber = Quantity.from(blockNumber);
    this.index = Quantity.from(index);
  }

  public toJSON = () => {
    return {
      hash: this.hash,
      nonce: this.nonce,
      blockHash: this.blockHash,
      blockNumber: this.blockNumber,
      transactionIndex: this.index,
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
}

/**
 * A FrozenTransaction, whose _source_ is an existing Block
 */
export class BlockTransaction extends FrozenTransaction {
  constructor(
    data: BlockRawTx,
    blockHash: Buffer,
    blockNumber: Buffer,
    index: Buffer,
    common: Common
  ) {
    // Build a GanacheRawExtraTx from the data given to use by BlockRawTx and
    // the constructor args
    const extraRaw: GanacheRawExtraTx = data.slice(9) as any;
    extraRaw.push(blockHash);
    extraRaw.push(blockNumber);
    extraRaw.push(index);
    super([(data as any) as EthereumRawTx, extraRaw], common);
  }
}

// export class Transaction extends BaseTransaction {
//   // from, index, hash, blockNumber, and blockHash are extra data we store to
//   // support account mascarading and quick receipts:
//   public from: Address;
//   public index: Quantity;
//   public hash: () => Data;
//   public blockNumber: Quantity;
//   public blockHash: Data;

//   constructor(transaction: Buffer) {}

//   public asVmTransaction() {
//     return Transaction.asVmTransaction(this, this.hardfork);
//   }

//   public static fromJSON(transaction: RpcTransaction) {}
//   public static fromBlock(
//     transaction: RpcTransaction,
//     index: Quantity,
//     blockNumber: Quantity,
//     blockHash: Data
//   ) {}
//   public static fromRaw(transaction: string) {
//     const raw = Data.from(transaction).toBuffer();
//     const decoded = rlpDecode(raw);
//     return Transaction.fromDecodedRaw(fromDecodedRaw);
//   }
//   public static fromDecodedRaw(transaction: Buffer) {
//     return Transaction.fromDb(decoded, raw);
//   }
// }
