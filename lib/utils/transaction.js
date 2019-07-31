const EthereumJsTransaction = require("ethereumjs-tx");
const EthereumJsFakeTransaction = require("ethereumjs-tx/fake");
const ethUtil = require("ethereumjs-util");
const assert = require("assert");
const rlp = ethUtil.rlp;
const to = require("./to");

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

function configZeroableField(tx, fieldName, fieldLength = 32) {
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
function fixProps(tx, data) {
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
function initData(tx, data) {
  if (data) {
    if (typeof data === "string") {
      data = to.buffer(data);
    }
    if (Buffer.isBuffer(data)) {
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
      tx._fields.forEach(function(field) {
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

module.exports = class Transaction extends EthereumJsTransaction {
  /**
   * @param {Object} [data] The data for this Transaction.
   * @param {Number} type The `Transaction.types` bit flag for this transaction
   *  Can be a combination of `Transaction.types.none`, `Transaction.types.signed`, and `Transaction.types.fake`.
   */
  constructor(data, type = Transaction.types.none) {
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

  /**
   * Prepares arbitrary JSON data for use in a Transaction.
   * @param {Object} json JSON object representing the Transaction
   * @param {Number} type The `Transaction.types` bit flag for this transaction
   *  Can be a combination of `Transaction.types.none`, `Transaction.types.signed`, and `Transaction.types.fake`.
   */
  static fromJSON(json, type) {
    let toAccount;
    if (json.to) {
      // Remove all padding and make it easily comparible.
      const buf = to.buffer(json.to);
      if (buf.equals(Buffer.from([0]))) {
        // if the address is 0x0 make it 0x0{20}
        toAccount = ethUtil.setLengthLeft(buf, 20);
      } else {
        toAccount = buf;
      }
    }
    const data = json.data || json.input;
    const options = {
      nonce: ethUtil.toBuffer(to.hex(json.nonce)),
      from: ethUtil.toBuffer(to.hex(json.from)),
      value: ethUtil.toBuffer(to.hex(json.value)),
      gasLimit: ethUtil.toBuffer(to.hex(json.gas || json.gasLimit)),
      gasPrice: ethUtil.toBuffer(to.hex(json.gasPrice)),
      data: data ? to.buffer(data) : null,
      to: toAccount,
      v: ethUtil.toBuffer(json.v),
      r: ethUtil.toBuffer(json.r),
      s: ethUtil.toBuffer(json.s)
    };

    const tx = new Transaction(options, type);
    tx._hash = json.hash ? to.buffer(json.hash) : null;
    return tx;
  }

  /**
   * Encodes the Transaction in order to be used in a database. Can be decoded
   * into an identical Transaction via `Transaction.decode(encodedTx)`.
   */
  encode() {
    const resultJSON = {
      hash: to.nullableRpcDataHexString(this.hash()),
      nonce: to.nullableRpcQuantityHexString(this.nonce) || "0x",
      from: to.rpcDataHexString(this.from),
      to: to.nullableRpcDataHexString(this.to),
      value: to.nullableRpcQuantityHexString(this.value),
      gas: to.nullableRpcQuantityHexString(this.gasLimit),
      gasPrice: to.nullableRpcQuantityHexString(this.gasPrice),
      data: this.data ? this.data.toString("hex") : null,
      v: to.nullableRpcQuantityHexString(this.v),
      r: to.nullableRpcQuantityHexString(this.r),
      s: to.nullableRpcQuantityHexString(this.s),
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
  validateNonce(expectedNonce) {
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
  sign() {
    sign.apply(this, arguments);
    this.type |= Transaction.types.signed;
  }

  /**
   * Returns a JSON-RPC spec compliant representation of this Transaction.
   *
   * @param {Object} block The block this Transaction appears in.
   */
  toJsonRpc(block) {
    const hash = this.hash();

    let transactionIndex = null;
    for (let i = 0, txns = block.transactions, l = txns.length; i < l; i++) {
      if (txns[i].hash().equals(hash)) {
        transactionIndex = i;
        break;
      }
    }

    const resultJSON = {
      hash: to.nullableRpcDataHexString(hash),
      nonce: to.rpcQuantityHexString(this.nonce),
      blockHash: to.nullableRpcDataHexString(block.hash()),
      blockNumber: to.nullableRpcQuantityHexString(block.header.number),
      transactionIndex: to.nullableRpcQuantityHexString(transactionIndex),
      from: to.rpcDataHexString(this.from),
      to: to.nullableRpcDataHexString(this.to),
      value: to.rpcQuantityHexString(this.value),
      gas: to.rpcQuantityHexString(this.gasLimit),
      gasPrice: to.rpcQuantityHexString(this.gasPrice),
      input: to.rpcDataHexString(this.data),
      v: to.nullableRpcQuantityHexString(this.v),
      r: to.nullableRpcQuantityHexString(this.r),
      s: to.nullableRpcQuantityHexString(this.s)
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
