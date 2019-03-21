const Transaction = require("../../../lib/utils/transaction");

module.exports = function createSignedTx(privateKey, params) {
  function _createAndSign(params) {
    const tx = new Transaction(params);
    tx.sign(privateKey);
    return tx;
  }

  const validBuffer = privateKey && Buffer.isBuffer(privateKey) && privateKey.length === 32;
  const validParams = params && typeof params === "object";

  if (validBuffer) {
    return validParams ? _createAndSign(params) : (params) => _createAndSign(params);
  }

  throw new Error("Please use args: privateKey(Buffer), params(Object) ");
};
