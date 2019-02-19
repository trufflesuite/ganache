const assert = require("assert");
const Ganache = require(process.env.TEST_BUILD
  ? "../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../index.js");
const request = require("request");
const portfinder = require("portfinder");
const sleep = require("../helpers/utils/sleep");

const host = "127.0.0.1";

const testTimeout = async(keepAliveTimeout, sleepTime, errorMessage) => {
  const server = Ganache.server({
    keepAliveTimeout
  });
  try {
    const port = await portfinder.getPortPromise();
    server.listen(port);

    let socket;
    const req = request.post({
      url: "http://" + host + ":" + port,
      json: {
        jsonrpc: "2.0",
        method: "eth_mining",
        params: [],
        id: 71
      },
      forever: true
    });

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

describe("options:keepAliveTimeout", () => {
  it("should timeout", async() => {
    await testTimeout(2000, 1000, "timeout should have destroyed socket");
  })
    .timeout(2500)
    .slow(1500);

  it("shouldn't timeout", async() => {
    await testTimeout(1000, 2000, "timeout should not have destroyed socket");
  })
    .timeout(2500)
    .slow(3000);
});
