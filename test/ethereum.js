var Web3 = require('web3');
var assert = require('assert');
var TestRPC = require("../index.js");


describe("Ethereum", function(done) {
  var web3 = new Web3();
  var provider;

  before("Initialize the provider", function() {
    provider = TestRPC.provider();
    web3.setProvider(provider);
  });

  it("should get ethereum version (eth_protocolVersion)", function(done) {
    web3.version.getEthereum(function(err, result){
      assert.equal(result, "63", "Network Version should be 63");
      done();
    })
  });
});
