const assert = require('assert');
const Ganache = require("../../index.js");
const request = require("request");
const portfinder = require("portfinder");

const host = "127.0.0.1";

const sleep = async (milliseconds) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, milliseconds);
  });
};

const testTimeout = async (timeout, sleepTime, errorMessage) => {
  const server = Ganache.server({
    keepAliveTimeout: timeout
  });
  const port = await portfinder.getPortPromise();
  server.listen(port);

  let socket;
  const r = request.post({
    url: "http://" + host + ":" + port,
    json: {
      "jsonrpc": "2.0",
      "method":"eth_mining",
      "params":[],
      "id":71
    },
    forever: true
  });
  r.on("socket", (s) => {
    socket = s;
  })

  await sleep(sleepTime);

  assert(socket.connecting === false, "socket should have connected by now");
  assert(socket.destroyed === timeout < sleepTime, errorMessage);

  r.destroy();

  server.close();
}

describe.only('options:keepAliveTimeout', () => {
  it('should timeout', async () => {
    await testTimeout(2000, 1000, "timeout should have destroyed socket");
  }).timeout(2500);

  it('shouldn\'t timeout', async () => {
    await testTimeout(1000, 2000, "timeout should not have destroyed socket");
  }).timeout(2500);
});
