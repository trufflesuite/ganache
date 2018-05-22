var assert = require("assert");
var Web3 = require("web3");
var Ganache = require("../index.js");
var to = require("../lib/utils/to.js");

describe("to.rpcQuantityHexString", function() {
  it("should print '0x0' for input 0", function(done) {
    assert.equal(to.rpcQuantityHexString(0), "0x0");
    done();
  });

  it("should print '0x0' for input '0'", function(done) {
    assert.equal(to.rpcQuantityHexString("0"), "0x0");
    done();
  });

  it("should print '0x0' for input '000'", function(done) {
    assert.equal(to.rpcQuantityHexString("000"), "0x0");
    done();
  });

  it("should print '0x0' for input '0x000'", function(done) {
    assert.equal(to.rpcQuantityHexString("0x000"), "0x0");
    done();
  });

  it("should print '0x20' for input '0x0020'", function(done) {
    assert.equal(to.rpcQuantityHexString("0x0020"), "0x20");
    done();
  });
});

describe("to.rpcDataHexString", function() {
  it("should differentiate between a list of 0 items and a list of one 0", function(done) {
    assert.notEqual(to.rpcDataHexString(Buffer.from("", "hex")), to.rpcDataHexString(Buffer.from("00", "hex")));
    done();
  })
})

function noLeadingZeros(method, result, path) {
  if (!path) {
    path = 'result'
  }

  if (typeof result === "string") {
    if (/^0x/.test(result)) {
      assert.equal(result, to.rpcQuantityHexString(result), `Field ${path} in ${method} response has leading zeroes.`);
    }
  } else if (typeof result === "object") {
    for (var key in result) {
      if (result.hasOwnProperty(key)) {
        if (Array.isArray(result)) {
          path += [key]
        } else {
          path += '.' + key
        }
        noLeadingZeros(method, result[key], path + (path ? '.' : '') + key);
      }
    }
  }
}

describe("JSON-RPC Response", function() {
  var web3 = new Web3();
  var provider = Ganache.provider();
  web3.setProvider(provider);

  var accounts;
  before(function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  // skipping this test for now as they aren't verifying the right thing that
  // is, leading zeroes are fine in some response fields. we need a better model
  // of expected response formatting/padding.
  it.skip("should not have leading zeros in rpc quantity hex strings", function(done) {
    var request = {
      "jsonrpc": "2.0",
      "method": "eth_getTransactionCount",
      "params": [
        accounts[0],
        "pending"
      ],
      "id": 1
    };

    provider.sendAsync(request, function(err, result) {
      noLeadingZeros('eth_getTransactionCount', result);

      request = {
        "jsonrpc": "2.0",
        "method": "eth_sendTransaction",
        "params": [
          {
            "from": accounts[0],
            "to": accounts[1],
            "value": "0x100000000"
          }
        ],
        "id": 2
      };

      provider.sendAsync(request, function() {
        // Ignore eth_sendTransaction result, it returns the transaction hash.
        // A transaction hash is a 'DATA' type, which can have leading zeroes
        // to pad it to an even string length (4 bit per char, so whole bytes).

        request = {
          "jsonrpc": "2.0",
          "method": "eth_getTransactionCount",
          "params": [
            accounts[0],
            "pending"
          ],
          "id": 3
        };

        provider.sendAsync(request, function(err, result) {
          noLeadingZeros('eth_getTransactionCount', result);
          done();
        });
      });
    });
  });
});
