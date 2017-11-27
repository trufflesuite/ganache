var assert = require("assert");
var Web3 = require("web3");
var TestRPC = require("../index.js");
var to = require("../lib/utils/to.js");

describe("to.hexWithoutLeadingZeroes", function() {
  it("should print '0x0' for input 0", function(done) {
    assert.equal(to.hexWithoutLeadingZeroes(0), "0x0");
    done();
  });

  it("should print '0x0' for input '0'", function(done) {
    assert.equal(to.hexWithoutLeadingZeroes("0"), "0x0");
    done();
  });

  it("should print '0x0' for input '000'", function(done) {
    assert.equal(to.hexWithoutLeadingZeroes("000"), "0x0");
    done();
  });

  it("should print '0x0' for input '0x000'", function(done) {
    assert.equal(to.hexWithoutLeadingZeroes("0x000"), "0x0");
    done();
  });

  it("should print '0x20' for input '0x0020'", function(done) {
    assert.equal(to.hexWithoutLeadingZeroes("0x0020"), "0x20");
    done();
  });
});

function noLeadingZeros(result) {
  if (typeof result === "string") {
    if (/^0x/.test(result)) {
      assert.equal(result, to.hexWithoutLeadingZeroes(result));
    }
  } else if (typeof result === "object") {
    for (var key in result) {
      if (result.hasOwnProperty(key)) {
        noLeadingZeros(result[key]);
      }
    }
  }
}

describe("JSON-RPC Response", function() {
  var web3 = new Web3();
  var provider = TestRPC.provider();
  web3.setProvider(provider);

  var accounts;
  before(function(done) {
    web3.eth.getAccounts(function(err, accs) {
      if (err) return done(err);
      accounts = accs;
      done();
    });
  });

  it("should not have leading zeros in hex strings", function(done) {
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
      noLeadingZeros(result);

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

      provider.sendAsync(request, function(err, result) {
        noLeadingZeros(result);

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
          noLeadingZeros(result);
          done();
        });
      });
    });
  });
});
