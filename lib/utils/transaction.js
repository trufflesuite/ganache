const EthereumJsTransaction = require("ethereumjs-tx");
const EthereumJsFakeTransaction = require("ethereumjs-tx/fake");
const ethUtil = require("ethereumjs-util");
const to = require("./to");
const utils = require("ethereumjs-util");
const assert = require("assert");
var rlp = require("rlp");

const sign = EthereumJsTransaction.prototype.sign;
const fakeHash = EthereumJsFakeTransaction.prototype.hash;

class Transaction extends EthereumJsTransaction {
  constructor(data, type = Transaction.types.none) {
    super();

    // ethereumjs-tx doesn't allow for a `0` value in a nonce, but we want it to.
    // Once https://github.com/ethereumjs/ethereumjs-tx/issues/112 is fixed we can remove this
    // const fields = ["nonce", "gasPrice", "gasLimit", "to", "value", "data", "v", "r", "s"];
    const fieldName = "nonce";
    const index = this._fields.indexOf(fieldName);
    const nonceFieldLength = 32;
    Object.defineProperty(this, fieldName, {
      enumerable: true,
      configurable: true,
      get: () => this.raw[index],
      set: (v) => {
        v = utils.toBuffer(v);
        assert(nonceFieldLength >= v.length, `The field ${fieldName} must not have more ${nonceFieldLength} bytes`);
        this.raw[index] = v;
      }
    });

    this.type = type;

    if (this.isFake()) {
      var self = this;

      /**
       * @prop {Buffer} from (read/write) Set from address to bypass transaction signing.
       */
      Object.defineProperty(this, "from", {
        enumerable: true,
        configurable: true,
        get: this.getSenderAddress.bind(self),
        set: (val) => {
          if (val) {
            self._from = ethUtil.toBuffer(val);
          } else {
            self._from = null;
          }
        }
      });

      if (data.from) {
        this.from = data.from;
      }

      this.hash = fakeHash;
    }

    if (data) {
      if (typeof data === "string") {
        data = Buffer.from(utils.stripHexPrefix(data), "hex");
      }
      if (Buffer.isBuffer(data)) {
        data = rlp.decode(data);
      }
      const self = this;
      if (Array.isArray(data)) {
        if (data.length > this._fields.length) {
          throw new Error("wrong number of fields in data");
        }

        // make sure all the items are buffers
        data.forEach((d, i) => {
          self[self._fields[i]] = utils.toBuffer(d);
        });
      } else if ((typeof data === "undefined" ? "undefined" : typeof data) === "object") {
        var keys = Object.keys(data);
        this._fields.forEach(function(field) {
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
      } else {
        throw new Error("invalid data");
      }
    }

    // calculate chainId from signature
    const sigV = ethUtil.bufferToInt(this.v);
    let chainId = Math.floor((sigV - 35) / 2);
    if (chainId < 0) {
      chainId = 0;
    }

    // set chainId
    this._chainId = chainId || data.chainId || 0;
  }

  static get types() {
    // values must be squares of 2
    return {
      none: 0,
      signed: 2,
      fake: 4
    };
  }

  static fromJSON(json, type) {
    let toAccount;
    if (json.to) {
      // Remove all padding and make it easily comparible.
      const buf = to.buffer(json.to);
      if (buf.equals(Buffer.from([0]))) {
        // if the address is 0x0 make is 0x0{20}
        toAccount = utils.setLengthLeft(buf, 20);
      } else {
        toAccount = buf;
      }
    }
    const data = json.data || json.input;
    const options = {
      nonce: utils.toBuffer(to.hex(json.nonce)),
      from: utils.toBuffer(to.hex(json.from)),
      value: utils.toBuffer(to.hex(json.value)),
      gasLimit: utils.toBuffer(to.hex(json.gas || json.gasLimit)),
      gasPrice: utils.toBuffer(to.hex(json.gasPrice)),
      data: data ? Buffer.from(utils.stripHexPrefix(data), "hex") : null,
      to: utils.toBuffer(toAccount),
      v: utils.toBuffer(json.v),
      r: utils.toBuffer(json.r),
      s: utils.toBuffer(json.s)
    };

    const tx = new Transaction(options, type);
    return tx;
  }

  encode() {
    const resultJSON = {
      hash: to.nullableRpcDataHexString(this.hash()),
      nonce: to.nullableRpcQuantityHexString(this.nonce) || "0x",
      from: to.rpcDataHexString(this.from),
      to: to.nullableRpcDataHexString(this.to),
      value: to.rpcQuantityHexString(this.value),
      gas: to.rpcQuantityHexString(this.gasLimit),
      gasPrice: to.rpcQuantityHexString(this.gasPrice),
      data: this.data ? this.data.toString("hex") : null,
      v: to.nullableRpcDataHexString(this.v),
      r: to.nullableRpcDataHexString(this.r),
      s: to.nullableRpcDataHexString(this.s),
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

  sign() {
    if (this.isSigned()) {
      return;
    }
    this.type |= Transaction.types.signed;
    sign.apply(this, arguments);
  }

  toJsonRpc(block) {
    var transactionIndex = 0;
    const hash = this.hash();
    for (let i = 0, txns = block.transactions, l = txns.length; i < l; i++) {
      let current = txns[i];
      if (current.hash().equals(hash)) {
        transactionIndex = i;
        break;
      }
    }
    const resultJSON = {
      hash: to.nullableRpcDataHexString(hash),
      nonce: to.rpcQuantityHexString(this.nonce),
      blockHash: to.nullableRpcDataHexString(block.hash()),
      blockNumber: to.nullableRpcQuantityHexString(block.header.number),
      transactionIndex: to.rpcQuantityHexString(transactionIndex),
      from: to.rpcDataHexString(this.from),
      to: to.nullableRpcDataHexString(this.to),
      value: to.rpcQuantityHexString(this.value),
      gas: to.rpcQuantityHexString(this.gasLimit),
      gasPrice: to.rpcQuantityHexString(this.gasPrice),
      input: to.rpcDataHexString(this.data),
      v: to.nullableRpcDataHexString(this.v),
      r: to.nullableRpcDataHexString(this.r),
      s: to.nullableRpcDataHexString(this.s)
    };

    return resultJSON;
  }
}

module.exports = Transaction;
