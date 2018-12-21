const assert = require("assert");
var Web3 = require("web3");
var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
var fs = require("fs");
var path = require("path");
var solc = require("solc");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

let mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

describe("Constantinople Hardfork", function() {
  let contract;

  before("compile contract", function() {
    this.timeout(200000);
    var result = solc.compile(
      {
        sources: {
          "ConstantinopleContract.sol": fs.readFileSync(path.join(__dirname, "ConstantinopleContract.sol"), "utf8")
        }
      },
      1
    );
    contract = {
      bytecode: "0x" + result.contracts["ConstantinopleContract.sol:ConstantinopleContract"].bytecode,
      abi: JSON.parse(result.contracts["ConstantinopleContract.sol:ConstantinopleContract"].interface)
    };
  });

  describe("Disallow Constantinople features", function() {
    var provider = Ganache.provider({
      mnemonic,
      gasLimit: 20000000
    });
    var web3 = new Web3(provider);
    var accounts;

    before("get accounts", function() {
      web3.eth.getAccounts(function(err, accs) {
        if (err) {
          assert.fail(err);
        }
        accounts = accs;
      });
    });

    it("should fail execution", function() {
      let DummyContract = new web3.eth.Contract(contract.abi);
      DummyContract.deploy({
        data: contract.bytecode
      })
        .send({ from: accounts[0], gas: 20000000 })
        .catch(function(_) {
          assert.fail("Deployment of Constantinople contract failed!");
        })
        .then(function(instance) {
          return instance.methods.test(2).call();
        })
        .then(function(_) {
          assert.fail("Constantinople functions should not be available!");
        });
    });
  });

  describe("Allow Constantinople features", function() {
    var provider = Ganache.provider({
      mnemonic,
      hardfork: "constantinople",
      gasLimit: 20000000
    });
    var web3 = new Web3(provider);
    var accounts;

    before("get accounts", function() {
      web3.eth.getAccounts(function(err, accs) {
        if (err) {
          assert.fail(err);
        }
        accounts = accs;
      });
    });

    it("should succeed execution", function() {
      let DummyContract = new web3.eth.Contract(contract.abi);
      DummyContract.deploy({
        data: contract.bytecode
      })
        .send({ from: accounts[0], gas: 20000000 })
        .catch(function(_) {
          assert.fail("Deployment of Constantinople contract failed!");
        })
        .then(function(instance) {
          return instance.methods.test(2).call();
        })
        .catch(function(_) {
          assert.fail("Constantinople functions should be available!");
        });
    });
  });
});
