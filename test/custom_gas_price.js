var Web3 = require("web3");
var assert = require("assert");
var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");

var logger = {
  log: function() {}
};

describe("Custom Gas Price", function() {
  it("should return gas price of 0xf when specified as a decimal", function(done) {
    var provider = Ganache.provider({ gasPrice: 15, logger: logger });
    var web3 = new Web3();
    web3.setProvider(provider);
    web3.eth.getGasPrice(function(err, result) {
      if (err) {
        return done(err);
      }
      assert.strictEqual(parseFloat(result), 15);
      done();
    });
  });

  it("should return gas price of 0xf when specified as hex", function(done) {
    var provider = Ganache.provider({ gasPrice: 0xf, logger: logger });
    var web3 = new Web3();
    web3.setProvider(provider);
    web3.eth.getGasPrice(function(err, result) {
      if (err) {
        return done(err);
      }
      assert.strictEqual(parseFloat(result), 15);
      done();
    });
  });
});
