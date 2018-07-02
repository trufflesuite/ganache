var Web3 = require('web3');
var Ganache = require("../index.js");
var fs = require("fs");
var path = require("path");
var solc = require("solc");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

let mnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

describe("Unlimited Contract Size", function() {
  let contract;

  before("compile contract", function() {
    var result = solc.compile({sources: {"LargeContract.sol": fs.readFileSync(path.join(__dirname, "LargeContract.sol"), "utf8")}}, 1);
    contract = {
      bytecode: "0x" + result.contracts["LargeContract.sol:LargeContract"].bytecode,
      abi: JSON.parse(result.contracts["LargeContract.sol:LargeContract"].interface)
    }
  });

  describe("Disallow Unlimited Contract Size", function() {
    var provider = new Ganache.provider({
      mnemonic,
      allowUnlimitedContractSize: false,
      gasLimit: 20000000
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

    it("should fail deployment", function(done) {
      let DummyContract = new web3.eth.Contract(contract.abi);
      DummyContract.deploy({
        data: contract.bytecode
      })
        .send({from: accounts[0], gas: 20000000})
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
      allowUnlimitedContractSize: true,
      gasLimit: 20000000
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

    it("should succeed deployment", function(done) {
      let DummyContract = new web3.eth.Contract(contract.abi);
      DummyContract.deploy({
        data: contract.bytecode
      })
        .send({from: accounts[0], gas: 20000000})
        .then(function(instance) {
          done()
        })
        .catch(function(error) {
          console.log(error);
          done(new Error("failed deployment when it should have succeeded"));
        });
    });
  });
});