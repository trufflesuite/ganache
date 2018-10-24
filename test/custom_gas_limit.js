var Web3 = require("web3");
var assert = require("assert");
var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");

describe("Custom Gas Limit", function() {
  var web3;

  before("Init the Web3 provider", function(done) {
    web3 = new Web3();
    web3.setProvider(
      Ganache.provider({
        gasLimit: 5000000
      })
    );
    done();
  });

  it("The block should show the correct custom Gas Limit", function(done) {
    web3.eth.getBlock(0, function(err, block) {
      if (err) {
        return done(err);
      }
      assert.deepStrictEqual(block.gasLimit, 5000000);
      done();
    });
  });
});
