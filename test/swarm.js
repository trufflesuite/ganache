var Web3 = require('web3');
var assert = require('assert');
var Ganache = require("../index.js");

describe("Swarm", function(done) {
  var web3 = new Web3();
  var provider;

  before("Initialize the provider", function() {
    provider = Ganache.provider();
    web3.setProvider(provider);
  });

  it.skip("should get swarm info (bzz_info)", function(done) {
    web3.bzz.getInfo(function(err, result){
      assert.isArray(result, "Stub returns empty array")
      done();
    })
  });

  it.skip("should get swarm hive (bzz_hive)", function(done) {
    web3.bzz.getHive(function(err, result){
      assert.isArray(result, "Stub returns empty array")
      done();
    })
  });
});
