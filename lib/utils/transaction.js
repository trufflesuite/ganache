const EthereumJsTransaction = require("ethereumjs-tx");
const EthereumJsFakeTransaction = require("ethereumjs-tx/fake");
const ethUtil = require("ethereumjs-util");
const to = require("./to");
const utils = require("ethereumjs-util");

const hash = EthereumJsTransaction.prototype.hash;
const fakeHash = EthereumJsFakeTransaction.prototype.hash;

class Transaction extends EthereumJsTransaction {
  constructor(data, type) {
    super(data);
    this.type = type;

    if (type === Transaction.types.fake) {
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

      this.from = data.from;
    }
  }

  static get types() {
    return {
      real: 0,
      fake: 1
    };
  }

  static fromJSON(json, type) {
    let toAccount;
    if (json.to) {
      // Remove all padding and make it easily comparible.
      const buf = utils.toBuffer(to.hex(json.to));
      if (!buf.equals(utils.toBuffer("0x0"))) {
        toAccount = utils.setLengthLeft(buf, 20);
      }
    }
    const options = {
      nonce: utils.toBuffer(to.hex(json.nonce)),
      from: utils.toBuffer(to.hex(json.from)),
      value: utils.toBuffer(to.hex(json.value)),
      gasLimit: utils.toBuffer(to.hex(json.gas || json.gasLimit)),
      gasPrice: utils.toBuffer(to.hex(json.gasPrice)),
      data: utils.toBuffer(to.hex(json.data)),
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
      nonce: to.rpcQuantityHexString(this.nonce),
      from: to.rpcDataHexString(this.from),
      to: to.nullableRpcDataHexString(this.to),
      value: to.rpcQuantityHexString(this.value),
      gas: to.rpcQuantityHexString(this.gasLimit),
      gasPrice: to.rpcQuantityHexString(this.gasPrice),
      data: to.rpcDataHexString(this.data),
      v: to.nullableRpcDataHexString(this.v),
      r: to.nullableRpcDataHexString(this.r),
      s: to.nullableRpcDataHexString(this.s),
      _type: this.type
    };
    return resultJSON;
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

  hash() {
    let hashMethod;
    switch (this.type) {
      case Transaction.types.real:
        hashMethod = hash;
        break;
      case Transaction.types.fake:
        hashMethod = fakeHash;
        break;
      default:
        // legacy?
        throw new Error("Legacy types not yet supported");
    }
    return hashMethod.apply(this, arguments);
  }
}

module.exports = Transaction;
