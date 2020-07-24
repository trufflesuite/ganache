import Errors from "./errors";
import {Data} from "@ganache/utils/src/things/json-rpc/json-rpc-data";
import {Quantity} from "@ganache/utils/src/things/json-rpc";
import params from "./params";
import {Transaction as EthereumJsTransaction, FakeTransaction as EthereumJsFakeTransaction} from "ethereumjs-tx";
import * as ethUtil from "ethereumjs-util";
import assert from "assert";
import {decode as rlpDecode} from "rlp";
import {RunTxResult} from "ethereumjs-vm/dist/runTx";
import {Block} from "../components/block-manager";
import TransactionReceipt from "./transaction-receipt";

const MAX_UINT64 = (1n << 64n) - 1n;
const ZERO_BUFFER = Buffer.from([0]);
const ONE_BUFFER = Buffer.from([0]);

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
  return EthereumJsFakeTransaction.prototype.hash.apply(this, arguments as unknown as [(boolean | undefined)?]);
};
const BUFFER_ZERO = Buffer.from([0]);

function configZeroableField(tx: any, fieldName: string, fieldLength = 32) {
  const index = tx._fields.indexOf(fieldName);
  const descriptor = Object.getOwnPropertyDescriptor(tx, fieldName);
  // eslint-disable-next-line accessor-pairs
  Object.defineProperty(tx, fieldName, {
    set: v => {
      descriptor.set.call(tx, v);
      v = ethUtil.toBuffer(v);
      assert(fieldLength >= v.length, `The field ${fieldName} must not have more ${fieldLength} bytes`);
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
function initData(tx: any, data: any) {
  if (data) {
    if (typeof data === "string") {
      data = Data.from(data).toBuffer();
      data = rlpDecode(data);
    } else if (Buffer.isBuffer(data)) {
      data = rlpDecode(data);
    }
    const self = tx;
    if (Array.isArray(data)) {
      // add in our hacked-in properties
      // which is the index in the block the transaciton
      // was mined in
      if (data.length === tx._fields.length + 3) {
        tx._index = data.pop();
        tx._blockNum = data.pop();
        tx._blockHash = data.pop();
      }
      if (data.length > tx._fields.length) {
        throw new Error("wrong number of fields in data");
      }

      // make sure all the items are buffers
      data.forEach((d, i) => {
        self[self._fields[i]] = ethUtil.toBuffer(d);
      });
    } else if ((typeof data === "undefined" ? "undefined" : typeof data) === "object") {
      const keys = Object.keys(data);
      tx._fields.forEach((field: any) => {
        if (keys.indexOf(field) !== -1) {
          self[field] = data[field];
        }
        if (field === "gasLimit") {
          if (keys.indexOf("gas") !== -1) {
            self["gas"] = data["gas"];
          }
        } else if (field === "data") {
          if (keys.indexOf("input") !== -1) {
            self["input"] = data["input"];
          }
        }
      });

      // Set chainId value from the data, if it's there and the data didn't
      // contain a `v` value with chainId in it already. If we do have a
      // data.chainId value let's set the interval v value to it.
      if (!tx._chainId && data && data.chainId != null) {
        tx.raw[self._fields.indexOf("v")] = tx._chainId = data.chainId || 0;
      }
    } else {
      throw new Error("invalid data");
    }
  }
}

//#endregion

interface Transaction extends Omit<EthereumJsTransaction, "toJSON"> {}
// TODO fix the EthereumJsTransaction as any via some "fake" multi-inheritance:
class Transaction extends (EthereumJsTransaction as any) {
  public locked: boolean = false;
  type: number;
  v: Buffer;
  r: Buffer;
  s: Buffer;
  raw: any;
  _chainId: any;
  _hash: Buffer;
  readonly from: Buffer;
  #receipt: any;
  /**
   * @param {Object} [data] The data for this Transaction.
   * @param {Number} type The `Transaction.types` bit flag for this transaction
   *  Can be a combination of `Transaction.types.none`, `Transaction.types.signed`, and `Transaction.types.fake`.
   */
  constructor(data: any, type: number = Transaction.types.none, options?: any) {
    super(void 0, options);

    // EthereumJS-TX Transaction overwrites our `toJSON`, so we overwrite it back here:
    this.toJSON = Transaction.prototype.toJSON.bind(this);

    this.type = type;

    fixProps(this, data);
    initData(this, data);
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
      Quantity.from(this.gasPrice).toBigInt() * Quantity.from(this.gasLimit).toBigInt() +
      Quantity.from(this.value).toBigInt()
    );
  }

  /**
   * Compute the 'intrinsic gas' for a message with the given data.
   * @param data The transaction's data
   */
  public calculateIntrinsicGas(): bigint {
    const data = this.data;

    // Set the starting gas for the raw transaction
    let gas = params.TRANSACTION_GAS;

    // Bump the required gas by the amount of transactional data
    const dataLength = data.byteLength;
    if (dataLength > 0) {
      // Zero and non-zero bytes are priced differently
      let nonZeroBytes: bigint = 0n;
      for (const b of data) {
        if (b !== 0) {
          nonZeroBytes++;
        }
      }
      // Make sure we don't exceed uint64 for all data combinations.
      if ((MAX_UINT64 - gas) / params.TRANSACTION_DATA_NON_ZERO_GAS < nonZeroBytes) {
        throw new Error(Errors.INTRINSIC_GAS_TOO_LOW);
      }
      gas += nonZeroBytes * params.TRANSACTION_DATA_NON_ZERO_GAS;

      let z = BigInt(dataLength) - nonZeroBytes;
      if ((MAX_UINT64 - gas) / params.TRANSACTION_DATA_ZERO_GAS < z) {
        throw new Error(Errors.INTRINSIC_GAS_TOO_LOW);
      }
      gas += z * params.TRANSACTION_DATA_ZERO_GAS;
    }
    return gas;
  }

  /**
   * Prepares arbitrary JSON data for use in a Transaction.
   * @param {Object} json JSON object representing the Transaction
   * @param {Number} type The `Transaction.types` bit flag for this transaction
   *  Can be a combination of `Transaction.types.none`, `Transaction.types.signed`, and `Transaction.types.fake`.
   */
  static fromJSON(json: any, type: any) {
    let toAccount;
    if (json.to) {
      // Remove all padding and make it easily comparible.
      const buf = Data.from(json.to).toBuffer();

      if (buf.equals(BUFFER_ZERO)) {
        // if the address is 0x0 make it 0x0{20}
        toAccount = Buffer.allocUnsafe(20).fill(0);
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

    const tx = new Transaction(options, type);
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
      nonce = BUFFER_ZERO;
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
    return {
      hash: Data.from(this.hash()),
      nonce: Quantity.from(this.nonce),
      blockHash: Data.from(block ? block.value.hash() : this._blockHash),
      blockNumber: Data.from(block ? block.value.header.number : this._blockNum),
      transactionIndex: Quantity.from(this._index),
      from: Data.from(this.from),
      to: Data.from(this.to),
      value: Quantity.from(this.value),
      gas: Quantity.from(this.gasLimit),
      gasPrice: Quantity.from(this.gasPrice),
      input: Data.from(this.data), // TODO: this output format probably needs the 0x stripped.
      v: Quantity.from(this.v),
      r: Quantity.from(this.r),
      s: Quantity.from(this.s)
    };
  }

  initializeReceipt = (result: RunTxResult) => {
    const vmResult = result.execResult;
    const status = vmResult.exceptionError ? ZERO_BUFFER : ONE_BUFFER;
    const gasUsed = result.gasUsed.toBuffer();
    const logsBloom = result.bloom.bitvector;
    const logs = vmResult.logs || [];

    this._receipt = TransactionReceipt.fromValues(status, gasUsed, logsBloom, logs, result.createdAddress);

    // returns RLP encoded data for use in a transaction trie
    return this._receipt.serialize(false);
  };

  getReceipt = () => {
    return this._receipt;
  };
}

export default Transaction;
