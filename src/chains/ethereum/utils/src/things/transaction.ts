import { ecrecover } from "ethereumjs-util";
import { RuntimeError, RETURN_TYPES } from "../errors/runtime-error";
import { utils, Data, Quantity } from "@ganache/utils";
import { params } from "./params";
import {
  Transaction as EthereumJsTransaction,
  FakeTransaction as EthereumJsFakeTransaction
} from "ethereumjs-tx";
import * as ethUtil from "ethereumjs-util";
import assert from "assert";
import { decode as rlpDecode } from "rlp";
import { RunTxResult } from "ethereumjs-vm/dist/runTx";
import { TransactionReceipt } from "./transaction-receipt";
import Common from "ethereumjs-common";
import { TransactionLog } from "./blocklogs";
import { Address } from "./address";
import { ExtractValuesFromType } from "../types/extract-values-from-types";
import { Block } from "./runtime-block";

const { KNOWN_CHAINIDS, BUFFER_ZERO, RPCQUANTITY_ONE } = utils;
const MAX_UINT64 = (1n << 64n) - 1n;
const ONE_BUFFER = RPCQUANTITY_ONE.toBuffer();

//#region helpers
const sign = EthereumJsTransaction.prototype.sign;
const fakeHash = function (this: Transaction) {
  // this isn't memoization of the hash. previous versions of ganache-core
  // created hashes in a different/incorrect way and are recorded this way
  // in snapshot dbs. We are preserving the chain's immutability by using the
  // stored hash instead of calculating it.
  if (this._hash != null) {
    return this._hash;
  }
  return EthereumJsFakeTransaction.prototype.hash.apply(
    this,
    (arguments as unknown) as [(boolean | undefined)?]
  );
};

function configZeroableField(tx: any, fieldName: string, fieldLength = 32) {
  const index = tx._fields.indexOf(fieldName);
  const descriptor = Object.getOwnPropertyDescriptor(tx, fieldName);
  // eslint-disable-next-line accessor-pairs
  Object.defineProperty(tx, fieldName, {
    set: v => {
      descriptor.set.call(tx, v);
      v = ethUtil.toBuffer(v);
      assert(
        fieldLength >= v.length,
        `The field ${fieldName} must not have more ${fieldLength} bytes`
      );
      tx._originals[index] = v;
    },
    get: () => {
      return tx._originals[index];
    }
  });
}

/**
 * etheruemjs-tx's Transactions don't behave quite like we need them to, so
 * we're monkey-patching them to do what we want here.
 * @param {Transaction} tx The Transaction to fix
 * @param {Object} [data] The data object
 */
function fixProps(tx: any, data: any) {
  // ethereumjs-tx doesn't allow for a `0` value in fields, but we want it to
  // in order to differentiate between a value that isn't set and a value
  // that is set to 0 in a fake transaction.
  // Once https://github.com/ethereumjs/ethereumjs-tx/issues/112 is figured
  // out we can probably remove this fix/hack.
  // We keep track of the original value and return that value when
  // referenced by its property name. This lets us properly encode a `0` as
  // an empty buffer while still being able to differentiate between a `0`
  // and `null`/`undefined`.
  tx._originals = [];
  const fieldNames = ["nonce", "gasPrice", "gasLimit", "value"] as const;
  fieldNames.forEach(fieldName => configZeroableField(tx, fieldName, 32));

  // Ethereumjs-tx doesn't set the _chainId value whenever the v value is set,
  // which causes transaction signing to fail on transactions that include a
  // chain id in the v value (like ethers.js does).
  // Whenever the v value changes we need to make sure the chainId is also set.
  const vDescriptors = Object.getOwnPropertyDescriptor(tx, "v");
  // eslint-disable-next-line accessor-pairs
  Object.defineProperty(tx, "v", {
    set: v => {
      vDescriptors.set.call(tx, v);
      // calculate chainId from signature
      const sigV = ethUtil.bufferToInt(tx.v);
      let chainId = Math.floor((sigV - 35) / 2);
      if (chainId < 0) {
        chainId = 0;
      }
      tx._chainId = chainId || 0;
    }
  });
}

function makeFake(tx: any, data: any) {
  if (tx.isFake()) {
    /**
     * @prop {Buffer} from (read/write) Set from address to bypass transaction
     * signing on fake transactions.
     */
    Object.defineProperty(tx, "from", {
      enumerable: true,
      configurable: true,
      get: tx.getSenderAddress.bind(tx),
      set: val => {
        if (val) {
          tx._from = ethUtil.toBuffer(val);
        } else {
          tx._from = null;
        }
      }
    });

    if (data && data.from) {
      tx.from = data.from;
    }

    tx.hash = fakeHash;
  }
}

/**
 * Parses the given data object and adds its properties to the given tx.
 * @param {Transaction} tx
 * @param {Object} [data]
 */
function initData(tx: Transaction, data: any) {
  if (data) {
    let parts: Buffer[];
    if (typeof data === "string") {
      //hex
      parts = (rlpDecode(Data.from(data).toBuffer()) as any) as Buffer[];
    } else if (Buffer.isBuffer(data)) {
      // Buffer
      parts = (rlpDecode(data) as any) as Buffer[];
    } else if (data.type === "Buffer") {
      // wire Buffer
      // handle case where a Buffer is sent as `{data: "Buffer", data: number[]}`
      // like if someone does `web3.eth.sendRawTransaction(tx.serialize())`
      const obj = data.data;
      const length = obj.length;
      const buf = Buffer.allocUnsafe(length);
      for (let i = 0; i < length; i++) {
        buf[i] = obj[i];
      }
      parts = (rlpDecode(buf) as any) as Buffer[];
    } else if (Array.isArray(data)) {
      // rlpdecoded data
      parts = data;
    } else if (typeof data === "object") {
      // JSON
      const keys = Object.keys(data);
      tx._fields.forEach((field: any) => {
        if (keys.indexOf(field) !== -1) {
          tx[field] = data[field];
        }
        if (field === "gasLimit") {
          if (keys.indexOf("gas") !== -1) {
            tx["gas"] = data["gas"];
          }
        } else if (field === "data") {
          if (keys.indexOf("input") !== -1) {
            tx["input"] = data["input"];
          }
        }
      });

      // Set chainId value from the data, if it's there and the data didn't
      // contain a `v` value with chainId in it already. If we do have a
      // data.chainId value let's set the interval v value to it.
      if (!tx._chainId && data && data.chainId != null) {
        tx.raw[tx._fields.indexOf("v")] = tx._chainId = data.chainId || 0;
      }
      return;
    } else {
      throw new Error("invalid data");
    }

    // add in our hacked-in properties
    // which is the index in the block the transaciton
    // was mined in
    if (parts.length === tx._fields.length + 5) {
      tx._from = parts.pop();
      tx.type = parts.pop()[0];
      tx._index = parts.pop();
      tx._blockNum = parts.pop();
      tx._blockHash = parts.pop();
    }
    if (parts.length > tx._fields.length) {
      throw new Error("wrong number of fields in data");
    }

    // make sure all the items are buffers
    parts.forEach((d, i) => {
      tx[tx._fields[i]] = ethUtil.toBuffer(d);
    });
  }
}

//#endregion

type TransactionFinalization =
  | { status: "confirmed"; error?: Error }
  | { status: "rejected"; error: Error };

export interface Transaction extends Omit<EthereumJsTransaction, "toJSON"> {}
// TODO fix the EthereumJsTransaction as any via some "fake" multi-inheritance:
export class Transaction extends (EthereumJsTransaction as any) {
  public locked: boolean = false;
  type: number;
  v: Buffer;
  r: Buffer;
  s: Buffer;
  raw: any;
  _chainId: any;
  _hash: Buffer;
  readonly from: Buffer;
  #receipt: TransactionReceipt;
  #logs: TransactionLog[];
  #finalizer: (eventData: TransactionFinalization) => void;
  #finalized: Promise<TransactionFinalization>;
  /**
   * @param {Object} [data] The data for this Transaction.
   * @param {Number} type The `Transaction.types` bit flag for this transaction
   *  Can be a combination of `Transaction.types.none`, `Transaction.types.signed`, and `Transaction.types.fake`.
   */
  constructor(
    data: any,
    common: Common,
    type: number = Transaction.types.none
  ) {
    super(void 0, { common });

    // EthereumJS-TX Transaction overwrites our `toJSON`, so we overwrite it back here:
    this.toJSON = Transaction.prototype.toJSON.bind(this);

    this.type = type;

    fixProps(this, data);
    initData(this, data);

    if (this.isFake()) {
      makeFake(this, data);
    }

    let finalizer: (value: TransactionFinalization) => void;
    this.#finalized = new Promise<TransactionFinalization>(resolve => {
      finalizer = (...args: any[]) => process.nextTick(resolve, ...args);
    });
    this.#finalizer = finalizer;
  }

  static get types() {
    // values must be powers of 2
    return {
      none: 0 as const,
      signed: 1 as const,
      fake: 2 as const
    };
  }

  cost(): bigint {
    return (
      Quantity.from(this.gasPrice).toBigInt() *
        Quantity.from(this.gasLimit).toBigInt() +
      Quantity.from(this.value).toBigInt()
    );
  }

  /**
   * Returns a Promise that is resolve with the confirmation status and, if
   * appropriate, an error property.
   *
   * Note: it is possible to be confirmed AND
   *
   * @param event "finalized"
   */
  once(event: "finalized") {
    return this.#finalized;
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
  finalize(status: "confirmed" | "rejected", error: Error = null) {
    // resolves the `#finalized` promise
    this.#finalizer({ status, error });
  }

  /**
   * Compute the 'intrinsic gas' for a message with the given data.
   * @param data The transaction's data
   * @param hardfork The hardfork use to determine gas costs
   * @returns The absolute minimum amount of gas this transaction will consume,
   * or `-1` if the data in invalid (gas consumption would exceed `MAX_UINT64`
   * (`(2n ** 64n) - 1n`).
   */
  public static calculateIntrinsicGas(
    data: Buffer | null,
    hardfork:
      | "constantinople"
      | "byzantium"
      | "petersburg"
      | "istanbul"
      | "muirGlacier"
  ) {
    // Set the starting gas for the raw transaction
    let gas = params.TRANSACTION_GAS;
    if (data) {
      // Bump the required gas by the amount of transactional data
      const dataLength = data.byteLength;
      if (dataLength > 0) {
        const TRANSACTION_DATA_NON_ZERO_GAS = params.TRANSACTION_DATA_NON_ZERO_GAS.get(
          hardfork
        );
        const TRANSACTION_DATA_ZERO_GAS = params.TRANSACTION_DATA_ZERO_GAS;

        // Zero and non-zero bytes are priced differently
        let nonZeroBytes: bigint = 0n;
        for (const b of data) {
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
  }
  public calculateIntrinsicGas(): bigint {
    return Transaction.calculateIntrinsicGas(this.data, this._common._hardfork);
  }

  /**
   * Prepares arbitrary JSON data for use in a Transaction.
   * @param {Object} json JSON object representing the Transaction
   * @param {Number} type The `Transaction.types` bit flag for this transaction
   *  Can be a combination of `Transaction.types.none`, `Transaction.types.signed`, and `Transaction.types.fake`.
   */
  static fromJSON(
    json: any,
    common: Common,
    type: ExtractValuesFromType<typeof Transaction.types>
  ) {
    let toAccount: Buffer;
    if (json.to) {
      // Remove all padding and make it easily comparible.
      const buf = Data.from(json.to).toBuffer();

      if (buf.equals(utils.BUFFER_ZERO)) {
        // if the address is 0x0 make it 0x0{20}
        toAccount = utils.ACCOUNT_ZERO;
      } else {
        toAccount = buf;
      }
    }
    const data = json.data || json.input;
    const options = {
      nonce: Data.from(json.nonce).toBuffer(),
      from: Data.from(json.from).toBuffer(),
      value: Quantity.from(json.value).toBuffer(),
      gasLimit: Quantity.from(json.gas || json.gasLimit).toBuffer(),
      gasPrice: Quantity.from(json.gasPrice).toBuffer(),
      data: data ? Data.from(data).toBuffer() : null,
      to: toAccount,
      v: Data.from(json.v).toBuffer(),
      r: Data.from(json.r).toBuffer(),
      s: Data.from(json.s).toBuffer()
    };

    const tx = new Transaction(options, common, type);
    tx._hash = json.hash ? Data.from(json.hash).toBuffer() : null;
    tx._from = json.from ? Data.from(json.from).toBuffer() : null;
    return tx;
  }

  /**
   * Encodes the Transaction in order to be used in a database. Can be decoded
   * into an identical Transaction via `Transaction.decode(encodedTx)`.
   */
  encode() {
    const resultJSON = {
      hash: Data.from(this.hash()).toString(),
      nonce: Quantity.from(this.nonce).toString() || "0x",
      from: Data.from(this.from).toString(),
      to: Data.from(this.to).toString(),
      value: Quantity.from(this.value).toString(),
      gas: Quantity.from(this.gasLimit).toString(),
      gasPrice: Quantity.from(this.gasPrice).toString(),
      data: this.data ? this.data.toString("hex") : null,
      v: Quantity.from(this.v).toString(),
      r: Quantity.from(this.r).toString(),
      s: Quantity.from(this.s).toString(),
      _type: this.type
    };
    return resultJSON;
  }

  isFake() {
    return (this.type & Transaction.types.fake) === Transaction.types.fake;
  }

  isSigned() {
    return (this.type & Transaction.types.signed) === Transaction.types.signed;
  }

  /**
   * Compares the transaction's nonce value to the given expectedNonce taking in
   * to account the type of transaction and comparison rules for each type.
   *
   * In a signed transaction a nonce of Buffer([]) is the same as Buffer([0]),
   * but in a fake transaction Buffer([]) is null and Buffer([0]) is 0.
   *
   * @param {Buffer} expectedNonce The value of the from account's next nonce.
   */
  validateNonce(expectedNonce: any) {
    let nonce;
    if (this.isSigned() && this.nonce.length === 0) {
      nonce = utils.BUFFER_ZERO;
    } else {
      nonce = this.nonce;
    }
    return nonce.equals(expectedNonce);
  }

  /**
   * Signs the transaction and sets the `type` bit for `signed` to 1,
   * i.e., `isSigned() === true`
   */
  sign(secretKey: Buffer) {
    this.type |= Transaction.types.signed;
    return sign.call(this, secretKey);
  }

  /**
   * Returns a JSON-RPC spec compliant representation of this Transaction.
   *
   * @param {Object} block The block this Transaction appears in.
   */
  toJSON(block?: Block) {
    let blockHash: Data;
    let blockNum: Quantity;
    if (block) {
      blockHash = block.hash();
      blockNum = block.header.number;
    } else {
      blockHash = this._blockHash ? Data.from(this._blockHash, 32) : null;
      blockNum = this._blockNum ? Quantity.from(this._blockNum) : null;
    }
    return {
      hash: Data.from(this.hash(), 32),
      nonce: Quantity.from(this.nonce),
      blockHash: blockHash ? blockHash : null,
      blockNumber: blockNum ? blockNum : null,
      transactionIndex: this._index ? Quantity.from(this._index) : null,
      from: Address.from(this.from),
      to: this.to.length === 0 ? null : Address.from(this.to),
      value: Quantity.from(this.value),
      gas: Quantity.from(this.gasLimit),
      gasPrice: Quantity.from(this.gasPrice),
      input: Data.from(this.data),
      v: Quantity.from(this.v),
      r: Quantity.from(this.r),
      s: Quantity.from(this.s)
    };
  }

  /**
   * Initializes the receipt and logs
   * @param result
   * @returns RLP encoded data for use in a transaction trie
   */
  fillFromResult(result: RunTxResult, cumulativeGasUsed: bigint) {
    const vmResult = result.execResult;
    const execException = vmResult.exceptionError;
    let status: Buffer;
    if (execException) {
      status = BUFFER_ZERO;
      this.execException = new RuntimeError(
        this.hash(),
        result,
        RETURN_TYPES.TRANSACTION_HASH
      );
    } else {
      status = ONE_BUFFER;
    }

    const receipt = (this.#receipt = TransactionReceipt.fromValues(
      status,
      Quantity.from(cumulativeGasUsed).toBuffer(),
      result.bloom.bitvector,
      (this.#logs = vmResult.logs || ([] as TransactionLog[])),
      result.createdAddress,
      result.gasUsed.toArrayLike(Buffer)
    ));

    return receipt.serialize(false);
  }

  getReceipt() {
    return this.#receipt;
  }

  getLogs() {
    return this.#logs;
  }

  public execException: RuntimeError = null;
}
