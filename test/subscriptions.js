// const assert = require("assert");
const Web3WsProvider = require("web3-providers-ws");
const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const pify = require("pify");
// const { readFileSync } = require("fs");
const { compileAndDeploy } = require("./helpers/contracts");
const CONTRACTNAME = "Example";

// const getJSON = function(relativePath) {
//   return JSON.parse(readFileSync(`${__dirname}/${relativePath}`).toString());
// };

const tests = function(web3) {
  // let accounts;

  before("create and fund personal account", async function() {
    // accounts = await web3.eth.getAccounts();
    // accounts = accounts.map(function(val) {
    //   return val.toLowerCase();
    // });
  });

  describe("subscriptions", function() {
    // const abi = getJSON("subscriptions_abi.json");
    // const bytecode = getJSON("subscriptions_bytecode.json")[0];

    it("should not crash", async function() {
      const ctx = await compileAndDeploy(`${__dirname}/${CONTRACTNAME}.sol`, CONTRACTNAME, web3);
      // const block = await web3.eth.getBlock("latest", false);
      // const gasLimit = block.gasLimit;

      let value = await ctx.instance.methods.value().call();
      console.log(value);

      // const subscription = await web3.eth.subscribe("newBlockHeaders", function(error, result) {
      //   if (!error) {
      //     console.log(result);
      //   }
      // });
    });
    // contract.methods.buyTokens(accounts[0]).send({from: accounts[0], value: web3.utils.toWei('0.00005', 'ether')});
  });
};

const logger = {
  log: function(message) {
    // console.log(message);
  }
};

describe("WebSockets Server:", function() {
  const Web3 = require("web3");
  const web3 = new Web3();
  const port = 12345;
  let server;

  before("Initialize Ganache server", async function() {
    server = Ganache.server({
      logger: logger,
      seed: "1337",
      verbose: true
      // so that the runtime errors on call test passes
    });
    await pify(server.listen)(port);
    const provider = new Web3WsProvider("ws://localhost:" + port);
    web3.setProvider(provider);
  });

  tests(web3);

  after("Shutdown server", async function() {
    let provider = web3._provider;
    web3.setProvider();
    if (provider) {
      provider.connection.close();
      await pify(server.close)();
    }
  });
});
