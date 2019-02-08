const pify = require("pify");

const send = (provider) => (method = "", ...params) => {
  return pify(provider.send.bind(provider))({
    id: `${new Date().getTime()}`,
    jsonrpc: "2.0",
    method,
    params: [...params]
  });
};

module.exports = send;
