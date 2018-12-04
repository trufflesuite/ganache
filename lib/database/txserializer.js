var to = require("../utils/to");
var Transaction = require("../utils/transaction");

const decode = function(json, done) {
  const options = {
    nonce: json.nonce,
    value: json.value,
    to: json.to,
    from: json.from,
    gasLimit: json.gas || json.gasLimit,
    gasPrice: json.gasPrice,
    data: json.data,
    v: json.v,
    r: json.r,
    s: json.s
  };

  let tx = Transaction.fromJSON(options, json._type);

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
};

const encode = function(tx, done) {
  const encoded = tx.encode();
  done(null, encoded);
};

module.exports = {
  encode,
  decode
};
