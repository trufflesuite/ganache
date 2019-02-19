const pify = require("pify");

/**
 * Generic RPC method
 * @param {Object} provider Ganache provider
 * @returns {Promise} Response object
 */
const generateSend = (provider) => (method = "", ...params) => {
  return pify(provider.send.bind(provider))({
    id: `${new Date().getTime()}`,
    jsonrpc: "2.0",
    method,
    params: [...params]
  });
};

/**
 * Generic RPC interface
 *
 * @param {string} method Name of provider method call
 * @param {Array} params Argument for method call
 * @param {Object} web3 Web3 interface
 * @returns {Promise} Response object
 */

const send = (method = "", params = [], web3) => {
  const send = pify(web3._provider.send.bind(web3._provider));
  return send({
    id: `${new Date().getTime()}`,
    jsonrpc: "2.0",
    method,
    params
  });
};

module.exports = {
  send,
  generateSend
};
