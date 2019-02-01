const pify = require("pify");
module.exports = {
  generateSend: (provider) => (method = "", ...params) => {
    return pify(provider.send.bind(provider))({
      id: `${new Date().getTime()}`,
      jsonrpc: "2.0",
      method,
      params: [...params]
    });
  }
};
