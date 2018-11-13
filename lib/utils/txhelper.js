var to = require("./to");
var FakeTransaction = require("ethereumjs-tx/fake.js");
var utils = require("ethereumjs-util");

module.exports = {
  toJSON: function(tx, block) {
    var transactionIndex = 0;
    for (var i = 0; i < block.transactions.length; i++) {
      var current = block.transactions[i];
      if (current.hash().equals(tx.hash())) {
        transactionIndex = i;
        break;
      }
    }
    var resultJSON = {
      hash: to.nullableRpcDataHexString(to.txHash(tx)),
      nonce: to.rpcQuantityHexString(tx.nonce),
      blockHash: to.nullableRpcDataHexString(block.hash()),
      blockNumber: to.nullableRpcQuantityHexString(block.header.number),
      transactionIndex: to.rpcQuantityHexString(transactionIndex),
      from: to.rpcDataHexString(tx.from),
      to: to.nullableRpcDataHexString(tx.to),
      value: to.rpcQuantityHexString(tx.value),
      gas: to.rpcQuantityHexString(tx.gasLimit),
      gasPrice: to.rpcQuantityHexString(tx.gasPrice),
      input: to.rpcDataHexString(tx.data)
    };

    if (tx.v && tx.v.length > 0 && tx.r && tx.r.length > 0 && tx.s && tx.s.length > 0) {
      resultJSON.v = to.hex(tx.v);
      resultJSON.r = to.hex(tx.r);
      resultJSON.s = to.hex(tx.s);
    }

    return resultJSON;
  },

  fromJSON: function(json) {
    var tx = new FakeTransaction({
      nonce: utils.toBuffer(to.hex(json.nonce)),
      from: utils.toBuffer(to.hex(json.from)),
      value: utils.toBuffer(to.hex(json.value)),
      gasLimit: utils.toBuffer(to.hex(json.gas)),
      gasPrice: utils.toBuffer(to.hex(json.gasPrice)),
      data: utils.toBuffer(to.hex(json.input))
    });

    if (json.v && json.v.length > 0 && json.r && json.r.length > 0 && json.s && json.s.length > 0) {
      tx.v = utils.toBuffer(to.hex(json.v));
      tx.r = utils.toBuffer(to.hex(json.r));
      tx.s = utils.toBuffer(to.hex(json.s));
    }

    if (json.to) {
      // Remove all padding and make it easily comparible.
      var buf = utils.toBuffer(to.hex(json.to));
      if (!buf.equals(utils.toBuffer("0x0"))) {
        tx.to = utils.setLengthLeft(buf, 20);
      }
    }

    return tx;
  }
};
