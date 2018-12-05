const pify = require("pify");
let id = 0;

/**
 * Generic RPC interface
 *
 * @param {string} method Name of provider method call
 * @param {Array} params Argument for method call
 * @param {Object} web3 Web3 interface
 */

const send = (method = "", params = [], web3) => {
  const send = pify(web3._provider.send.bind(web3._provider));
  return send({
    id: `${++id}`,
    jsonrpc: "2.0",
    method,
    params
  });
};

module.exports = {
  send
};
