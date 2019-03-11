const assert = require("assert");
const portfinder = require("portfinder");
const request = require("request");
const Ganache = require(process.env.TEST_BUILD
  ? "../../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../../index.js");

const sleep = require("../../helpers/utils/sleep");

const testTimeout = async(keepAliveTimeout, sleepTime, errorMessage) => {
  const host = "127.0.0.1";
  const server = Ganache.server({
    keepAliveTimeout
  });

  try {
    let socket;
    const port = await portfinder.getPortPromise();
    const req = request.post({
      url: `http://${host}:${port}`,
      json: {
        jsonrpc: "2.0",
        method: "eth_mining",
        params: [],
        id: 71
      },
      forever: true
    });

    server.listen(port);
    req.on("socket", (s) => {
      socket = s;
    });

    await sleep(sleepTime);
    assert(socket.connecting === false, "socket should have connected by now");
    assert.deepStrictEqual(socket.destroyed, keepAliveTimeout < sleepTime, errorMessage);

    req.destroy();
  } catch (e) {
    // tests crashed.
    assert.fail(e);
  } finally {
    server.close();
  }
};

module.exports = testTimeout;
