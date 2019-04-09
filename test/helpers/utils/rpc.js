const { promisify } = require("util");

/**
 * Generic RPC method
 * @param {Object} provider Ganache provider
 * @returns {Function} Send method
 */
const generateSend = function(provider) {
  /**
   * Generic RPC method
   * @param {String} method JSON RPC method
   * @param {...*} params JSON RPC parameters
   * @returns {Promise} Response object
   */
  return function(method = "", ...params) {
    return promisify(provider.send.bind(provider))({
      id: `${new Date().getTime()}`,
      jsonrpc: "2.0",
      method,
      params: [...params]
    });
  };
};

module.exports = generateSend;
