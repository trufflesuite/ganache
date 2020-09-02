const Ganache = require(process.env.TEST_BUILD
  ? "../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../index.js");
const generateSend = require("../helpers/utils/rpc");
const promisify = require("pify");
const assert = require("assert");
const PORT = 8545;
const HOST = "127.0.0.1";
const HTTPADDRESS = `http://${HOST}:${PORT}`;

const testHttp = function(web3) {
  let web3send;
  let accounts;

  before("get personal accounts", async function() {
    accounts = await web3.eth.getAccounts();
  });

  before("setup provider send fn", function() {
    web3send = generateSend(web3.currentProvider);
  });

  describe("subscriptions", function() {
    it("should gracefully handle http subscription attempts", async function() {
      // Attempt to subscribe http connection to 'pendingTransactions'
      const { error } = await web3send("eth_subscribe", "pendingTransactions");
      assert(error, "http subscription should respond with an error");
      assert.strictEqual(error.code, -32000, "Error code should equal -32000");
      assert.strictEqual(error.message, "notifications not supported", "notifications should not be supported");

      // Issue a sendTransaction - ganache should not attempt to issue a message to http subscriptions
      const { result } = await web3send("eth_sendTransaction", { from: accounts[0], value: "0x1" });
      // Get receipt -- ensure ganache is still running/accepting calls
      const receipt = await web3send("eth_getTransactionReceipt", result);
      // Receipt indicates that ganache has NOT crashed and continues to handle RPC requests
      assert(!receipt.error, "Should not respond with an error.");
      assert(receipt.result, "Should respond with a receipt.");
    });
  });
};

const testWebSocket = function(web3) {
  let web3send;

  before("setup provider send fn", function() {
    web3send = generateSend(web3.currentProvider);
  });

  describe("subscriptions", function() {
    it("should handle eth_subscribe/eth_unsubscribe", async function() {
      // Attempt to subscribe to 'newHeads'
      const receipt = await web3send("eth_subscribe", "newHeads");
      assert(receipt.result, "ID must be returned (eth_subscribe successful)");
      const result = await web3send("eth_unsubscribe", receipt.result);
      assert(result.result, "Result must be true (eth_unsubscribe successful)");
    });
  });
};

describe("WebSockets Server:", function() {
  const Web3 = require("web3");
  const web3 = new Web3();
  let server;

  before("Initialize Ganache server", async function() {
    server = Ganache.server({
      seed: "1337"
    });
    await promisify(server.listen)(PORT + 1);
    const provider = new Web3.providers.WebsocketProvider("ws://localhost:" + (PORT + 1));
    web3.setProvider(provider);
  });

  testWebSocket(web3);

  after("Shutdown server", async function() {
    const provider = web3._provider;
    web3.setProvider();
    provider.connection.close();
    await promisify(server.close)();
  });
});

describe("HTTP Server should not handle subscriptions:", function() {
  const Web3 = require("web3");
  const web3 = new Web3();
  let server;

  before("Initialize Ganache server", async function() {
    server = Ganache.server({
      seed: "1337"
    });

    await promisify(server.listen)(PORT);
    web3.setProvider(new Web3.providers.HttpProvider(HTTPADDRESS));
  });

  testHttp(web3);

  after("Shutdown server", async function() {
    await promisify(server.close)();
  });
});
