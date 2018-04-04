var Web3 = require('web3');
var assert = require('assert');
var Ganache = require("../index.js");
var fs = require("fs");
var path = require("path");
var solc = require("solc");
var to = require("../lib/utils/to.js");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

let mnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

describe("Unlimited Contract Size", function() {
  let contract;

  function generateLargeContract() {
    let result = {
      bytecode: "",
      abi: ""
    };

    return result;
  }

  before("generate contract", function() {
    contract = generateLargeContract();
  });

  describe("Disallow Unlimited Contract Size", function() {
    var provider = new Ganache.provider({
      mnemonic,
      allowUnlimitedContractSize: false
    });
    var web3 = new Web3(provider);
    var accounts;

    before("get accounts", function(done) {
      web3.eth.getAccounts(function(err, accs) {
        if (err) return done(err);
        accounts = accs;
        done();
      });
    });

    it("fails deployment", function(done) {
      this.timeout(10000);

      DummyContract = new web3.eth.Contract(contract.abi);
      return DummyContract.deploy({data: contract.bytecode})
        .send({from: accounts[0], gas: 3141592})
        .then(function(instance) {
          done(new Error("succeeded deployment when it should have failed"));
        })
        .catch(function(error) {
          done();
        });
    });
  });

  describe("Allow Unlimited Contract Size", function() {
    var provider = new Ganache.provider({
      mnemonic,
      allowUnlimitedContractSize: true
    });
    var web3 = new Web3(provider);
    var accounts;

    before("get accounts", function(done) {
      web3.eth.getAccounts(function(err, accs) {
        if (err) return done(err);
        accounts = accs;
        done();
      });
    });

    it("succeeds deployment", function(done) {
      this.timeout(10000);

      DummyContract = new web3.eth.Contract(contract.abi);
      return DummyContract.deploy({data: contract.bytecode})
        .send({from: accounts[0], gas: 3141592})
        .then(function(instance) {
          done()
        })
        .catch(function(error) {
          done(new Error("failed deployment when it should have succeeded"));
        });
    });
  });
});
