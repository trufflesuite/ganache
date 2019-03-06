const Transaction = require("../../../lib/utils/transaction");

const createSignedTx = (privateKey, params) => {
  function _createAndSign(params) {
    const signedTx = new Transaction(params);
    signedTx.sign(privateKey);
    return signedTx.serialize();
  }

  const validBuffer = privateKey && Buffer.isBuffer(privateKey);
  const validParams = params && typeof params === "object";

  if (validBuffer && !validParams) {
    return (params) => _createAndSign(params);
  }
  if (validBuffer && validParams) {
    return _createAndSign(params);
  }
  throw new Error("Please use args: privateKey(Buffer), params(Object) ");
};

module.exports = createSignedTx;
