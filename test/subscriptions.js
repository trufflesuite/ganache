const assert = require("assert");
// const Ganache = require(process.env.TEST_BUILD
//   ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
//   : "../index.js");
// const pify = require("pify");
// const { readFileSync } = require("fs");
// const { compileAndDeploy } = require("./helpers/contracts");
// const CONTRACTNAME = "Example";
const PORT = 8545;
const HTTPADDRESS = "http://127.0.0.1:" + PORT;
// const WSADDRESS = "ws://127.0.0.1:" + PORT;
// const to = require("../lib/utils/to");

// const getJSON = function(relativePath) {
//   return JSON.parse(readFileSync(`${__dirname}/${relativePath}`).toString());
// };

const tests = function(web3, newWeb3) {
  let accounts;

  before("create and fund personal account", async function() {
    accounts = await web3.eth.getAccounts();
    // accounts = accounts.map(function(val) {
    //   return val.toLowerCase();
    // });
  });

  describe("subscriptions", function() {
    // const abi = getJSON("subscriptions_abi.json");
    // const bytecode = getJSON("subscriptions_bytecode.json")[0];

    it("should not crash", async function() {
      // var exampleSocket = new WebSocket(WSADDRESS, "data");
      // const ctx = await compileAndDeploy(`${__dirname}/${CONTRACTNAME}.sol`, CONTRACTNAME, web3);
      // const block = await web3.eth.getBlock("latest", false);
      // const gasLimit = block.gasLimit;

      // let value = await ctx.instance.methods.value().call();
      // console.log(value);

      // const subscription = await newWeb3.eth.subscribe("pendingTransactions");
      // const unsubscription = await subscription.unsubscribe();
      // const block = await newWeb3.eth.getBlock("latest", false);
      console.log(accounts[0]);
      console.log(1);
      web3.currentProvider.send(
        {
          jsonrpc: "2.0",
          method: "eth_subscribe",
          params: ["newHeads", {}],
          id: new Date().getTime()
        },
        function name(err, result) {
          if (err) {
            console.log(err);
          }
          console.log(result);
          assert(!!result);
          try {
            web3.currentProvider.send(
              {
                jsonrpc: "2.0",
                method: "eth_sendTransaction",
                params: { from: accounts[0], value: "0x1" },
                id: new Date().getTime()
              },
              function name(err, res) {
                console.log(err);
                console.log(res);
                assert(!!res);
              }
            );
          } catch (error) {
            console.log(error);
          }
        }
      );
    });
    // contract.methods.buyTokens(accounts[0]).send({from: accounts[0], value: web3.utils.toWei('0.00005', 'ether')});
  });
};

// const logger = {
//   log: function(message) {
//     // console.log(message);
//   }
// };

describe.skip("WebSockets Server:", function() {
  const Web3 = require("web3");
  const web3 = new Web3(new Web3.providers.HttpProvider(HTTPADDRESS));
  // const newWeb3 = new Web3(new Web3.providers.WebsocketProvider(WSADDRESS));

  console.log(web3.currentProvider);

  tests(web3, null);

  after("Shutdown server", async function() {
    let provider = web3._provider;
    web3.setProvider();
    if (provider) {
      // provider.connection.close();
      // await pify(server.close)();
    }
  });
});
