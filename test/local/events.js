var Web3 = require("web3");
var Web3WsProvider = require("web3-providers-ws");
var Ganache = require(process.env.TEST_BUILD
  ? "../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../index.js");
var assert = require("assert");
const compile = require("../helpers/contract/singleFileCompile");

var tests = function(web3, EventTest) {
  var accounts;
  var instance;

  describe("events", function() {
    before(function(done) {
      web3.eth.getAccounts(function(err, accs) {
        if (err) {
          return done(err);
        }
        accounts = accs;
        done();
      });
    });

    before(function(done) {
      this.timeout(10000);
      var { result } = compile("./test/contracts/events/", "EventTest");

      if (result.errors != null) {
        done(result.errors[0]);
        return;
      }

      var abi = result.contracts["EventTest.sol"].EventTest.abi;
      EventTest = new web3.eth.Contract(abi);
      EventTest._data = "0x" + result.contracts["EventTest.sol"].EventTest.evm.bytecode.object;
      done();
    });

    before(function() {
      return EventTest.deploy({ data: EventTest._data })
        .send({ from: accounts[0], gas: 3141592 })
        .then((contract) => {
          instance = contract;

          // TODO: ugly workaround - not sure why this is necessary.
          if (!instance._requestManager.provider) {
            instance._requestManager.setProvider(web3.eth._provider);
          }
        });
    });

    it("should handle events properly via the data event handler", function(done) {
      var expectedValue = "1";

      var event = instance.events.ExampleEvent({ filter: { first: expectedValue } });

      var listener = function(result) {
        assert.strictEqual(result.returnValues.first, expectedValue);
        done();
      };

      event.once("data", listener);
      event.once("error", (err) => done(err));

      instance.methods.triggerEvent(1, 6).send({ from: accounts[0], gas: 3141592 });
    });

    // NOTE! This test relies on the events triggered in the tests above.
    it("grabs events in the past", function(done) {
      var expectedValue = "2";

      var event = instance.events.ExampleEvent({ filter: { first: expectedValue }, fromBlock: 0 });

      var listener = function(result) {
        assert.strictEqual(result.returnValues.first, expectedValue);
        done();
      };

      event.once("data", listener);

      instance.methods.triggerEvent(2, 6).send({ from: accounts[0], gas: 3141592 });
    });

    // NOTE! This test relies on the events triggered in the tests above.
    it("accepts an array of topics as a filter", function(done) {
      var expectedValueA = 3;
      var expectedValueB = 4;

      var event = instance.events.ExampleEvent({ filter: { first: [expectedValueA, expectedValueB] }, fromBlock: 0 });

      var waitingFor = {};
      waitingFor[expectedValueA] = true;
      waitingFor[expectedValueB] = true;

      var listener = function(result) {
        assert(Object.prototype.hasOwnProperty.call(waitingFor, result.returnValues.first));
        delete waitingFor[result.returnValues.first];

        if (Object.keys(waitingFor).length === 0) {
          event.removeAllListeners();
          done();
        }
      };

      event.on("data", listener);

      event.once("error", (err) => {
        event.removeAllListeners();
        done(err);
      });

      instance.methods
        .triggerEvent(expectedValueA, 6)
        .send({ from: accounts[0], gas: 3141592 })
        .then((result) => {
          return instance.methods.triggerEvent(expectedValueB, 7).send({ from: accounts[0], gas: 3141592 });
        });
    });

    it("only returns logs for the expected address", function(done) {
      var expectedValue = "1";

      EventTest.deploy({ data: EventTest._data })
        .send({ from: accounts[0], gas: 3141592 })
        .then((newInstance) => {
          // TODO: ugly workaround - not sure why this is necessary.
          if (!newInstance._requestManager.provider) {
            newInstance._requestManager.setProvider(web3.eth._provider);
          }

          var event = newInstance.events.ExampleEvent({ filter: { first: expectedValue }, fromBlock: 0 });

          event.on("data", function(result) {
            assert(result.returnValues.first === expectedValue);
            // event.removeAllListeners()
            done();
          });

          instance.methods
            .triggerEvent(5, 6)
            .send({ from: accounts[0], gas: 3141592 })
            .then(() => {
              newInstance.methods.triggerEvent(expectedValue, 6).send({ from: accounts[0], gas: 3141592 });
            });
        });
    });

    // NOTE! This test relies on the events triggered in the tests above.
    it("should return logs with correctly formatted logIndex and transactionIndex", function(done) {
      var provider = web3.currentProvider;

      provider.send(
        {
          jsonrpc: "2.0",
          method: "eth_getLogs",
          params: [
            {
              fromBlock: "0x0",
              toBlock: "latest",
              topics: [
                "0xc54307031d9aa93e0568c363be84a9400dce343fef6a2851d55662a6af1a29da",
                "0x0000000000000000000000000000000000000000000000000000000000000001",
                "0x0000000000000000000000000000000000000000000000000000000000000006"
              ]
            }
          ],
          id: new Date().getTime()
        },
        function(err, result) {
          if (err) {
            return done(err);
          }
          const logIndex = result.result[0].logIndex;
          const transactionIndex = result.result[0].transactionIndex;
          assert.strictEqual(logIndex, "0x0");
          assert.strictEqual(transactionIndex, "0x0");
          done();
        }
      );
    });

    // NOTE! This test relies on the events triggered in the tests above.
    it("should return logs using blockHash", function(done) {
      var provider = web3.currentProvider;

      provider.send(
        {
          jsonrpc: "2.0",
          method: "eth_getBlockByNumber",
          params: [
            "latest",
            false
          ],
          id: new Date().getTime()
        },
        function(err, result) {
          if (err) {
            return done(err);
          }

          const hash = result.result.hash;

          provider.send(
            {
              jsonrpc: "2.0",
              method: "eth_getLogs",
              params: [
                {
                  blockHash: hash,
                  topics: [
                    "0xc54307031d9aa93e0568c363be84a9400dce343fef6a2851d55662a6af1a29da",
                    "0x0000000000000000000000000000000000000000000000000000000000000001",
                    "0x0000000000000000000000000000000000000000000000000000000000000006"
                  ]
                }
              ],
              id: new Date().getTime()
            },
            function(err, result) {
              if (err) {
                return done(err);
              }
              const logIndex = result.result[0].logIndex;
              const transactionIndex = result.result[0].transactionIndex;
              assert.strictEqual(logIndex, "0x0");
              assert.strictEqual(transactionIndex, "0x0");
              done();
            }
          );
        }
      );
    });

    it("always returns a change for every new block subscription when instamining", function(done) {
      var provider = web3.currentProvider;

      provider.send(
        {
          jsonrpc: "2.0",
          method: "eth_subscribe",
          params: ["newHeads"],
          id: new Date().getTime()
        },
        function(err, result) {
          if (err) {
            return done(err);
          }

          const listener = function(err, result) {
            if (result === undefined) {
              // If there's only one argument, it's the result, not an error
              result = err;
            } else if (err) {
              return done(err);
            }
            const firstChanges = result.params.result.hash;
            assert.strictEqual(firstChanges.length, 66); // Ensure we have a hash
            provider.removeAllListeners("data");
            done();
          };

          // can't use `once` here because Web3WsProvider only has `on` :-(
          provider.on("data", listener);

          web3.currentProvider.send(
            {
              jsonrpc: "2.0",
              method: "evm_mine",
              id: new Date().getTime()
            },
            function(err) {
              if (err) {
                done(err);
              }
            }
          );
        }
      );
    });

    // NOTE! This test relies on the events triggered in the tests above.
    it("ensures topics are respected in past events, using `event.get()` (exclusive)", function(done) {
      var unexpectedValue = 1337;
      var event = instance.events.ExampleEvent({ filter: { first: unexpectedValue }, fromBlock: 0 });

      // There should be no logs because we provided a different number.
      var listener = function(result) {
        assert.fail("Event should not have fired");
      };

      event.once("data", listener);

      instance.methods
        .triggerEvent(6, 6)
        .send({ from: accounts[0], gas: 3141592 })
        .then(() => {
          // have to finish somehow...
          setTimeout(() => {
            event.removeAllListeners();
            done();
          }, 250);
        });
    });

    it("will not fire if logs are requested when fromBlock doesn't exist", function(done) {
      var event = instance.events.ExampleEvent({ fromBlock: 100000 });

      // fromBlock doesn't exist, hence no logs
      var listener = function(result) {
        assert.fail("Event should not have fired");
      };

      event.on("data", listener);

      instance.methods
        .triggerEvent(8, 6)
        .send({ from: accounts[0], gas: 3141592 })
        .then(() => {
          // have to finish somehow...
          setTimeout(() => {
            event.removeAllListeners();
            done();
          }, 250);
        });
    });
  });
};

var logger = {
  log: function(message) {
    // console.log(message);
  }
};

describe("Provider:", function() {
  var web3 = new Web3();
  web3.setProvider(
    Ganache.provider({
      logger: logger
    })
  );
  tests(web3);
});

describe("Server:", function(done) {
  var web3 = new Web3();
  var port = 12345;
  var server;

  before("Initialize Ganache server", function(done) {
    server = Ganache.server({
      logger: logger,
      ws: true
    });
    server.listen(port, function() {
      web3.setProvider(new Web3WsProvider("ws://localhost:" + port));
      done();
    });
  });

  tests(web3);

  after("Shutdown server", function(done) {
    const provider = web3._provider;
    web3.setProvider();
    provider.connection.close();
    server.close(done);
  });
});
