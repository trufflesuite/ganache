import { JsonRpcData } from "./json-rpc/json-rpc-data";
import { JsonRpcQuantity } from "./json-rpc";

// import { JsonRpcData, JsonRpcQuantity } from "./json-rpc";
// import Address from "./address";

// type TransactionDataObject = {
//     blockHash: string,
//     blockNumber: string,
//     from: string,
//     gas: string,
//     gasPrice:  string,
//     hash: string,
//     input: string,
//     nonce:  string,
//     to: string,
//     transactionIndex: string,
//     value: string,
//     v: string,
//     r: string,
//     s: string
// }

// type TransactionData = {
//     blockHash: JsonRpcData,
//     blockNumber: JsonRpcData,
//     from: Address,
//     gas: JsonRpcQuantity,
//     gasPrice:  JsonRpcQuantity,
//     hash: JsonRpcData,
//     input: JsonRpcData,
//     nonce:  JsonRpcQuantity,
//     to: Address,
//     transactionIndex: JsonRpcQuantity,
//     value: JsonRpcQuantity,
//     v: JsonRpcQuantity,
//     r: JsonRpcData,
//     s: JsonRpcData
// }

// export default class Transaction implements TransactionData {
//     blockHash: JsonRpcData<string | Buffer>;
//     blockNumber: JsonRpcData<string | Buffer>;
//     from: JsonRpcData<string | Buffer>;
//     gas: JsonRpcQuantity<string | bigint | Buffer>;
//     gasPrice: JsonRpcQuantity<string | bigint | Buffer>;
//     get hash(): JsonRpcData {
//         return new JsonRpcData("0x123");
//     };
//     input: JsonRpcData<string | Buffer>;
//     nonce: JsonRpcQuantity<string | bigint | Buffer>;
//     to: JsonRpcData<string | Buffer>;
//     transactionIndex: JsonRpcQuantity<string | bigint | Buffer>;
//     value: JsonRpcQuantity<string | bigint | Buffer>;
//     v: JsonRpcQuantity<string | bigint | Buffer>;
//     r: JsonRpcData<string | Buffer>;
//     s: JsonRpcData<string | Buffer>;
//     constructor(transaction: TransactionData) {
//         const obj =  {
//             blockHash: JsonRpcData.from("0x123456", 32), // 32 Bytes - hash of the block where this transaction was in. null when its pending.
//             blockNumber:  JsonRpcQuantity.from(123n),// QUANTITY - block number where this transaction was in. null when its pending.
//             from: JsonRpcData.from("0x123456", 32), // 20 Bytes - address of the sender.
//             gas: JsonRpcQuantity.from(123n),// QUANTITY - gas provided by the sender.
//             gasPrice:  JsonRpcQuantity.from(123n),// QUANTITY - gas price provided by the sender in Wei.
//             hash: JsonRpcData.from("0x123456", 32),// DATA, 32 Bytes - hash of the transaction.
//             input: JsonRpcData.from("0x123"),// DATA - the data send along with the transaction.
//             nonce:  JsonRpcQuantity.from(123456n),// QUANTITY - the number of transactions made by the sender prior to this one.
//             to: JsonRpcData.from("0x123456", 20),// DATA, 20 Bytes - address of the receiver. null when its a contract creation transaction.
//             transactionIndex: JsonRpcQuantity.from(99n),// QUANTITY - integer of the transaction's index position in the block. null when its pending.
//             value: JsonRpcQuantity.from(123n),// QUANTITY - value transferred in Wei.
//             v: JsonRpcQuantity.from(Buffer.from([27])), // QUANTITY - ECDSA recovery id
//             r: JsonRpcData.from(Buffer.from([12,34,46]), 32),// DATA, 32 Bytes - ECDSA signature r
//             s: JsonRpcData.from("0x123456", 32),// DATA, 32 Bytes - ECDSA signature s
//         } as any;
//         Object.keys(obj).forEach((key) => {
//             (this as any)[key] = obj[key] as any;
//         });
//     }
//     // https://github.com/fastify/fast-json-stringify
//     // https://github.com/YousefED/typescript-json-schema
//     toObject(): TransactionDataObject {
//         const a = JSON.stringify({
//             gasPrice: this.gasPrice
//         });
//         console.log(a);
//         return {
//             gasPrice: this.gasPrice.toString()
//         } as TransactionDataObject;
//     }
//     /**
//      * 
//      * @param tx Cost returns gasPrice * gas + value.
//      */
//     cost(): bigint {
//         return this.gasPrice.toBigInt() * this.gas.toBigInt() + this.value.toBigInt();
//     }
// }




const EthereumJsTransaction = require("ethereumjs-tx");
const EthereumJsFakeTransaction = require("ethereumjs-tx/fake");
const ethUtil = require("ethereumjs-util");
const assert = require("assert");
const rlp = require("rlp");

const sign = EthereumJsTransaction.prototype.sign;
const fakeHash = function() {
  // this isn't memoization of the hash. previous versions of ganache-core
  // created hashes in a different/incorrect way and are recorded this way
  // in snapshot dbs. We are preserving the chain's immutability by using the
  // stored hash instead of calculating it.
  if (this._hash != null) {
    return this._hash;
  }
  return EthereumJsFakeTransaction.prototype.hash.apply(this, arguments);
};
const BUFFER_ZERO = Buffer.from([0]);

function configZeroableField(tx: any, fieldName: string, fieldLength = 32) {
  const index = tx._fields.indexOf(fieldName);
  const descriptor = Object.getOwnPropertyDescriptor(tx, fieldName);
  // eslint-disable-next-line accessor-pairs
  Object.defineProperty(tx, fieldName, {
    set: (v) => {
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
  const fieldNames = ["nonce", "gasPrice", "gasLimit", "value"];
  fieldNames.forEach((fieldName) => configZeroableField(tx, fieldName, 32));

  // Ethereumjs-tx doesn't set the _chainId value whenever the v value is set,
  // which causes transaction signing to fail on transactions that include a
  // chain id in the v value (like ethers.js does).
  // Whenever the v value changes we need to make sure the chainId is also set.
  const vDescriptors = Object.getOwnPropertyDescriptor(tx, "v");
  // eslint-disable-next-line accessor-pairs
  Object.defineProperty(tx, "v", {
    set: (v) => {
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
      set: (val) => {
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
      data = JsonRpcData.from(data).toBuffer();
      data = rlp.decode(data);
    } else if (Buffer.isBuffer(data)) {
      data = rlp.decode(data);
    }
    const self = tx;
    if (Array.isArray(data)) {
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

export default class Transaction extends EthereumJsTransaction {
  /**
   * @param {Object} [data] The data for this Transaction.
   * @param {Number} type The `Transaction.types` bit flag for this transaction
   *  Can be a combination of `Transaction.types.none`, `Transaction.types.signed`, and `Transaction.types.fake`.
   */
  constructor(data: any, type = Transaction.types.none) {
    super();

    this.type = type;

    fixProps(this, data);
    initData(this, data);
  }

  static get types() {
    // values must be powers of 2
    return {
      none: 0,
      signed: 1,
      fake: 2
    };
  }

  cost(): bigint {
    return JsonRpcQuantity.from(this.gasPrice).toBigInt() * JsonRpcQuantity.from(this.gas).toBigInt() + JsonRpcQuantity.from(this.value).toBigInt();
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
      const buf = JsonRpcData.from(json.to).toBuffer();
      
      if (buf.equals(BUFFER_ZERO)) {
        // if the address is 0x0 make it 0x0{20}
        toAccount = ethUtil.setLengthLeft(buf, 20);
      } else {
        toAccount = buf;
      }
    }
    const data = json.data || json.input;
    const options = {
      nonce: JsonRpcData.from(json.nonce).toBuffer(),
      from: JsonRpcData.from(json.from).toBuffer(),
      value: JsonRpcQuantity.from(json.value).toBuffer(),
      gasLimit: JsonRpcQuantity.from(json.gas || json.gasLimit).toBuffer(),
      gasPrice: JsonRpcQuantity.from(json.gasPrice).toBuffer(),
      data: data ? JsonRpcData.from(data).toBuffer() : null,
      to: toAccount,
      v: JsonRpcData.from(json.v).toBuffer(),
      r: JsonRpcData.from(json.r).toBuffer(),
      s: JsonRpcData.from(json.s).toBuffer()
    };

    const tx = new Transaction(options, type);
    tx._hash = json.hash ? JsonRpcData.from(json.hash).toBuffer() : null;
    return tx;
  }

  /**
   * Encodes the Transaction in order to be used in a database. Can be decoded
   * into an identical Transaction via `Transaction.decode(encodedTx)`.
   */
  encode() {
    const resultJSON = {
      hash: JsonRpcData.from(this.hash()).toString(),
      nonce: JsonRpcQuantity.from(this.nonce).toString() || "0x",
      from: JsonRpcData.from(this.from).toString(),
      to: JsonRpcData.from(this.to).toString(),
      value: JsonRpcQuantity.from(this.value).toString(),
      gas: JsonRpcQuantity.from(this.gasLimit).toString(),
      gasPrice: JsonRpcQuantity.from(this.gasPrice).toString(),
      data: this.data ? this.data.toString("hex") : null,
      v: JsonRpcData.from(this.v).toString(),
      r: JsonRpcData.from(this.r).toString(),
      s: JsonRpcData.from(this.s).toString(),
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
  toJsonRpc(block: any) {
    const hash = this.hash();

    let transactionIndex = null;
    for (let i = 0, txns = block.transactions, l = txns.length; i < l; i++) {
      if (txns[i].hash().equals(hash)) {
        transactionIndex = i;
        break;
      }
    }

    const resultJSON = {
      hash: JsonRpcData.from(hash).toString(),
      nonce: JsonRpcQuantity.from(this.nonce).toString(),
      blockHash: JsonRpcData.from(block.hash()).toString(),
      blockNumber: JsonRpcData.from(block.header.number).toString(),
      transactionIndex: JsonRpcQuantity.from(BigInt(transactionIndex)).toString(),
      from: JsonRpcData.from(this.from).toString(),
      to: JsonRpcData.from(this.to).toString(),
      value: JsonRpcQuantity.from(this.value).toString(),
      gas: JsonRpcQuantity.from(this.gasLimit).toString(),
      gasPrice: JsonRpcQuantity.from(this.gasPrice).toString(),
      input: JsonRpcData.from(this.data).toString(), // TODO: this output format probably needs the 0x stripped.
      v: JsonRpcData.from(this.v).toString(),
      r: JsonRpcData.from(this.r).toString(),
      s: JsonRpcData.from(this.s).toString()
    };

    return resultJSON;
  }

  /**
   * Computes a sha3-256 hash of the serialized tx
   *
   * This method is nearly identical to ethereumjs-tx hash with the exception of
   * the v,r,s value setting when _chainId > 0. Because the `_chainId` in our
   * implementation is calculated whenever the v is updated we have to make sure
   * we don't recalc the chainId when we set the v to soemthing else.
   *
   * Note: If the transaction is a fake transaction this hash method gets
   * overridden in the constructor.
   *
   * @param {Boolean} [includeSignature=true] whether or not to inculde the signature
   * @return {Buffer}
   */
  hash(includeSignature = true) {
    // EIP155 spec:
    // when computing the hash of a transaction for purposes of signing or recovering,
    // instead of hashing only the first six elements (ie. nonce, gasprice, startgas, to, value, data),
    // hash nine elements, with v replaced by CHAIN_ID, r = 0 and s = 0

    let items;
    if (includeSignature) {
      items = this.raw;
    } else {
      // cache the chainId here
      const chainId = this._chainId;
      if (chainId > 0) {
        const cacheRaw = this.raw.slice();
        // Setting `this.v` changes the value of `this._chainId`
        this.v = chainId;
        this.r = 0;
        this.s = 0;

        items = this.raw;
        this.raw = cacheRaw;
        // set the chainId back to its original value here.
        this._chainId = chainId;
      } else {
        items = this.raw.slice(0, 6);
      }
    }

    // create hash
    return ethUtil.rlphash(items);
  }
};
