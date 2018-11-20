const pify = require("pify");

/**
 * Generic RPC interface
 *
 * @param {string} method Name of provider method call
 * @param {Array} params Argument for method call
 * @param {Object} web3 Web3 interface
 */

const rpcSend = (method = "", params = [], web3) => {
  const send = pify(web3._provider.send.bind(web3._provider));
  // an "id" is required here because the web3 websocket provider (v1.0.0-beta.35) throws if it is
  // missing (it's probably just a bug on their end)
  return send({
    id: "1",
    jsonrpc: "2.0",
    method,
    params
  });
};

module.exports = {
  rpcSend
};
