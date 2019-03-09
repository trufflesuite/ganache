const sendWithCallback = (provider) => (method, params, callback) => {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }

  provider.send(
    {
      jsonrpc: "2.0",
      method: method,
      params: params || [],
      id: new Date().getTime()
    },
    callback
  );
};

module.exports = sendWithCallback;
