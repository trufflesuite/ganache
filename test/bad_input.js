var Web3 = require("web3");
var Ganache = require("../../ganache-core/src/packages/core/lib/index.js").default;
var assert = require("assert-match");
var regex = require("assert-match/matchers").regex;

var tests = function(web3) {
  var accounts;

  // The second request, after the first in each of these tests,
  // informs us whether or not the provider crashed.
  function secondRequest(callback) {
    web3.eth.getAccounts(callback);
  }

  describe("bad input", function() {
    before(function(done) {
      web3.eth.getAccounts(function(err, accs) {
        if (err) {
          return done(err);
        }
        accounts = accs;
        done();
      });
    });

    it("recovers after to address that isn't a string", function(done) {
      var provider = web3.currentProvider;

      provider.send(
        {
          jsonrpc: "2.0",
          method: "eth_sendTransaction",
          params: [
            {
              value: "0x0",
              gas: "0xf4240",
              from: accounts[0],
              // Buffers have been sent in the past
              to: {
                type: "Buffer",
                data: [
                  // ...
                ]
              },
              data: "0xe1fa8e84666f6f0000000000000000000000000000000000000000000000000000000000"
            }
          ],
          id: 2
        },
        function() {
          // Ignore any errors, but make sure we can make the second request
          secondRequest(done);
        }
      );
    });

    // SKIP IN v3 because we support pending transactions now!
    it.skip("recovers after bad nonce (too high)", function(done) {
      var provider = web3.currentProvider;

      var request = {
        jsonrpc: "2.0",
        method: "eth_sendTransaction",
        params: [
          {
            value: "0x10000000",
            gas: "0xf4240",
            from: accounts[0],
            to: accounts[1],
            nonce: "0xffffffff" // too big nonce
          }
        ],
        id: 2
      };

      provider.send(request, function(err, result) {
        if (err) {
          assert(
            err.message.indexOf(
              "the tx doesn't have the correct nonce. account has nonce of: 0 tx has nonce of: 4294967295"
            ) >= 0
          );
        }
        // We're supposed to get an error the first time. Let's assert we get the right one.
        // Note that if using the Ganache as a provider, err will be non-null when there's
        // an error. However, when using it as a server it won't be. In both cases, however,
        // result.error should be set with the same error message. We'll check for that.
        assert(
          result.error.message.indexOf(
            "the tx doesn't have the correct nonce. account has nonce of: 0 tx has nonce of: 4294967295"
          ) >= 0
        );

        delete request.params[0].nonce;
        provider.send(request, done);
      });
    });

    it("recovers after bad nonce (too low)", function(done) {
      var provider = web3.currentProvider;

      var request = {
        jsonrpc: "2.0",
        method: "eth_sendTransaction",
        params: [
          {
            value: "0x10000000",
            gas: "0xf4240",
            from: accounts[0],
            to: accounts[1],
            nonce: "0x0" // too low nonce
          }
        ],
        id: 2
      };
      // because we skipped the too-high nonce test, which actually does eventually send a transaction,
      // we need to do the same, here... which is why there are two `provider.send(request, function(err, result) {`s
      // the first works, the second should fail
      provider.send({ ...request }, function() {
        provider.send({ ...request }, function(err, result) {
          if (err) {
            assert(
              /the tx doesn't have the correct nonce. account has nonce of: 1 tx has nonce of: 0/.test(err.message),
              `Expected incorrect nonce error, got '${err.message}', instead.`
            );
          }
          // We're supposed to get an error the first time. Let's assert we get the right one.
          // Note that if using the Ganache as a provider, err will be non-null when there's
          // an error. However, when using it as a server it won't be. In both cases, however,
          // result.error should be set with the same error message. We'll check for that.
          assert(
            /the tx doesn't have the correct nonce. account has nonce of: 1 tx has nonce of: 0/.test(
              result.error.message
            ),
            `Expected incorrect nonce error, got '${result.error.message}', instead.`
          );

          delete request.params[0].nonce;
          provider.send(request, done);
        });
      });
    });

    it("recovers after bad balance", function(done) {
      web3.eth.getBalance(accounts[0], function(_, balance) {
        var provider = web3.currentProvider;

        var request = {
          jsonrpc: "2.0",
          method: "eth_sendTransaction",
          params: [
            {
              value: "0x1000000000000000000000000000",
              gas: "0xf4240",
              from: accounts[0],
              to: accounts[1]
            }
          ],
          id: 2
        };

        provider.send(request, function(err, result) {
          if (err) {
            assert.deepEqual(
              err.message,
              regex(/insufficient funds for gas \* price \+ value/),
              `Unexpected error message. Got ${err.message}.`
            );
          }
          // We're supposed to get an error the first time. Let's assert we get the right one.
          // Note that if using the Ganache as a provider, err will be non-null when there's
          // an error. However, when using it as a server it won't be. In both cases, however,
          // result.error should be set with the same error message. We'll check for that.
          assert.deepEqual(
            result.error.message,
            regex(/insufficient funds for gas \* price \+ value/),
            `Unexpected error message. Got ${result.error.message}.`
          );

          request.params[0].value = "0x5";
          provider.send(request, done);
        });
      });
    });
  });
};

describe("Provider:", function() {
  var web3 = new Web3();
  web3.setProvider(Ganache.provider({ gasLimit: 6721975, instamine: "eager", vmErrorsOnRPCResponse: true }));
  tests(web3);
});

describe("Server:", function(done) {
  var web3 = new Web3();
  var port = 12345;
  var server;

  before("Initialize Ganache server", function(done) {
    server = Ganache.server({ instamine: "eager", vmErrorsOnRPCResponse: true });
    server.listen(port, function(err) {
      if (err) {
        throw err;
      }
      web3.setProvider(new Web3.providers.HttpProvider("http://localhost:" + port));
      done();
    });
  });

  after("Shutdown server", async() => {
    await server.close();
  });

  tests(web3);
});
