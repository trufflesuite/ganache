var Web3 = require('web3');
var TestRPC = require("../index.js");
var assert = require('assert');
var solc = require("solc");
var async = require("async");

var source = "                      \
pragma solidity ^0.4.2;             \
contract EventTest {                \
  event ExampleEvent(uint indexed first, uint indexed second);   \
                                    \
  function triggerEvent(uint _first, uint _second) public { \
    ExampleEvent(_first, _second);      \
  }                                 \
}"

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

var tests = function(web3, EventTest) {
  var accounts;
  var EventTest;
  var instance;

  describe("events", function() {
    before(function(done) {
      web3.eth.getAccounts(function(err, accs) {
        if (err) return done(err);
        accounts = accs;
        done();
      });
    });

    before(function() {
      var result = solc.compile(source, 1);

      if (result.errors != null) {
        throw new Error(result.errors[0]);
      }

      var abi = JSON.parse(result.contracts[":EventTest"].interface);
      EventTest = web3.eth.contract(abi);
      EventTest._data = "0x" + result.contracts[":EventTest"].bytecode;
    });

    before(function(done) {
      EventTest.new({from: accounts[0], data: EventTest._data, gas: 3141592}, function(err, contract) {
        if (err) return done(err);

        if (!contract.address) {
          return;
        }
        instance = contract;
        done();
      });
    });

    it("handles events properly, using `event.watch()`", function(done) {
      var expected_value = 5;

      var event = instance.ExampleEvent({first: expected_value});

      var cleanup = function(err) {
        if (err) return done(err);
        event.stopWatching(done);
      };

      event.watch(function(err, result) {
        if (err) return cleanup(err);

        if (result.args.first == expected_value) {
          return cleanup();
        }

        return cleanup(new Error("Received event that didn't have the correct value!"));
      });

      instance.triggerEvent(5, 6, {from: accounts[0], gas: 3141592}, function(err, result) {
        if (err) return cleanup(err);
      });
    });

    it("handles events properly, using `event.get()`", function(done) {
      this.timeout(10000)
      var expected_value = 6;
      var interval;

      var event = instance.ExampleEvent({first: expected_value});

      function cleanup(err) {
        if (err) return done(err);

        event.stopWatching(function(err) {
          if (err) return done(err);
          clearInterval(interval);
          done(err);
        });
      }

      instance.triggerEvent(6, 7, {from: accounts[0]}, function(err, result) {
        if (err) return cleanup(err);

        interval = setInterval(function() {
          event.get(function(err, logs) {
            if (err) return cleanup(err);

            if (logs.length == 0) return;

            if (logs[0].args.first == expected_value) {
              return cleanup();
            }

            return cleanup(new Error("Received event that didn't have the correct value!"));
          });
        }, 500);
      });
    });

    // NOTE! This test relies on the events triggered in the tests above.
    it("grabs events in the past, using `event.get()`", function(done) {
      var expected_value = 5;
      var event = instance.ExampleEvent({first: expected_value}, {fromBlock: 0});

      event.get(function(err, logs) {
        if (err) return done(err);

        event.stopWatching(function(err) {
          if (err) return done(err);
          assert(logs.length == 1);
          done();
        });
      });
    });

    // NOTE! This test relies on the events triggered in the tests above.
    it("accepts an array of topics as a filter", function(done) {
      var expected_value_a = 5;
      var expected_value_b = 6;
      var event = instance.ExampleEvent({first: [expected_value_a, expected_value_b]}, {fromBlock: 0});

      event.get(function(err, logs) {
        if (err) return done(err);

        event.stopWatching(function(err) {
          if (err) return done(err);

          assert(logs.length == 2);
          done();
        });
      });
    });

    it("only returns logs for the expected address", function(done) {
      var expected_value = 5;

      EventTest.new({from: accounts[0], data: EventTest._data, gas: 3141592}, function(err, newInstance) {
        if (err) return done(err);

        if (!newInstance.address) {
          return;
        }

        newInstance.triggerEvent(expected_value, 20, {from: accounts[0], gas: 3141592}, function(err, result) {
          if (err) return done(err);

          var event = newInstance.ExampleEvent({first: expected_value}, {fromBlock: 0});

          // Only one event should be triggered for this new instance.
          event.get(function(err, logs) {
            if (err) return done(err);

            event.stopWatching(function(err) {
              if (err) return done(err);
              assert(logs.length == 1);
              done();
            });
          });
        });
      });
    });

    it("always returns a change for every new block filter when instamining", function(done) {
      var provider = web3.currentProvider;

      // In this test, we'll create a block filter and request filter changes twice.
      // The responses from the first and second filter changes request must be different,
      // and the first must return the block hash of the previous block to ensure it gets
      // some response even though no transaction was made.

      var filter_id;
      var first_changes;
      var second_changes;

      async.series([
        function(c) {
          provider.sendAsync({
            jsonrpc: "2.0",
            method: "eth_newBlockFilter",
            params: [],
            id: new Date().getTime()
          }, function(err, result) {
            if (err) return c(err);
            filter_id = result.result;
            c();
          });
        },
        function(c) {
          provider.sendAsync({
            jsonrpc: "2.0",
            method: "eth_getFilterChanges",
            params: [filter_id],
            id: new Date().getTime()
          }, function(err, result) {
            if (err) return c(err);
            first_changes = result.result;
            c();
          });
        },
        function(c) {
          provider.sendAsync({
            jsonrpc: "2.0",
            method: "eth_getFilterChanges",
            params: [filter_id],
            id: new Date().getTime()
          }, function(err, result) {
            if (err) return c(err);
            second_changes = result.result;
            c();
          });
        }
      ], function(err) {
        if (err) return done(err);

        assert.equal(first_changes.length, 1);
        assert.equal(first_changes[0].length, 66); // Ensure we have a hash
        assert.equal(second_changes.length, 0); // no transactions were actually made
        assert.notEqual(first_changes[0], second_changes[0]);

        done();
      })
    });

    // NOTE! This test relies on the events triggered in the tests above.
    it("ensures topics are respected in past events, using `event.get()` (exclusive)", function(done) {
      var unexpected_value = 1337;
      var event = instance.ExampleEvent({first: unexpected_value}, {fromBlock: 0});

      // There should be no logs because we provided a different number.
      event.get(function(err, logs) {
        if (err) return done(err);
        assert(logs.length == 0);
        done();
      });
    });

    it("ensures topics are respected in past events, using `event.get()` (inclusive/exclusive)", function(done) {
      var expected_value = 6;
      var event = instance.ExampleEvent({second: expected_value}, {fromBlock: 0});

      // There should be no logs because we provided a different number.
      event.get(function(err, logs) {
        if (err) return done(err);
        assert(logs.length == 1);
        done();
      });
    });

    it("will return an empty array if logs are requested when fromBlock doesn't exist", function(done) {
      var event = instance.ExampleEvent({}, {fromBlock: 100000});

      // fromBlock doesn't exist, hence no logs.
      event.get(function(err, logs) {
        if (err) return done(err);
        assert(logs.length == 0);
        done();
      });
    });

    it("will return an empty array if logs are requested when toBlock doesn't exist", function(done) {
      var expected_value = 6;
      var event = instance.ExampleEvent({}, {toBlock: 100000});

      // fromBlock doesn't exist, hence no logs.
      event.get(function(err, logs) {
        if (err) return done(err);
        assert(logs.length == 0);
        done();
      });
    });
  })
};

var logger = {
  log: function(message) {
    //console.log(message);
  }
};

describe("Provider:", function() {
  var web3 = new Web3();
  web3.setProvider(TestRPC.provider({
    logger: logger
  }));
  tests(web3);
});

describe("Server:", function(done) {
  var web3 = new Web3();
  var port = 12345;
  var server;

  before("Initialize TestRPC server", function(done) {
    server = TestRPC.server({
      logger: logger
    });
    server.listen(port, function() {
      web3.setProvider(new Web3.providers.HttpProvider("http://localhost:" + port));
      done();
    });
  });

  after("Shutdown server", function(done) {
    server.close(done);
  });

  tests(web3);
});
