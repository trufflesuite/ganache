var to = require("../utils/to");
var utils = require("ethereumjs-util");
var Transaction = require("../utils/transaction");

module.exports = {
  encode: function(tx, done) {
    var encoded = tx.encode();

    // encoded.from = to.hex(tx.from);
    // encoded.hash = to.txHash(tx);

    // encoded._isRawTx = tx._isRawTx;

    done(null, encoded);
  },
  decode: function(json, done) {
    // TODO: We can't use txhelper here because there are two
    // JSON serialization types: ethereumjs-tx, and web3.
    // Here we deserialize from ethereumjs-tx because it's
    // closer to the metal, so to speak.
    const options = {
      nonce: utils.toBuffer(json.nonce),
      value: utils.toBuffer(json.value),
      to: utils.toBuffer(json.to),
      from: utils.toBuffer(json.from),
      gasLimit: utils.toBuffer(json.gasLimit),
      gasPrice: utils.toBuffer(json.gasPrice),
      data: utils.toBuffer(json.data),
      v: utils.toBuffer(json.v),
      r: utils.toBuffer(json.r),
      s: utils.toBuffer(json.s)
    };

    let tx = Transaction.fromJSON(options, json.type);

    if (to.hex(tx.hash()) !== json.hash) {
      const e = new Error(
        "DB consistency check: Decoded transaction hash " +
          "didn't match encoded hash. Expected: " +
          json.hash +
          "; actual: " +
          to.hex(tx.hash())
      );
      return done(e);
    }

    done(null, tx);
  }
};
