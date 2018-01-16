var Web3 = require('web3');
var assert = require('assert');
var Ganache = require("../index.js");

describe("Whisper", function(done) {
  var web3 = new Web3();
  var provider;

  before("Initialize the provider", function() {
    provider = Ganache.provider();
    web3.setProvider(provider);
  });

  it("should call get whisper version (shh_version)", function() {
    return web3.shh.getVersion(function(err, result){
      assert.equal(result, "2", "Whisper version should be 2");
    })
  });
});
