const assert = require("assert");
const Web3 = require("web3");
const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

describe("Constantinople Hardfork", function() {
  let contract;

  before("compile contract", function() {
    this.timeout(200000);
    let result = solc.compile(
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
    const provider = Ganache.provider({
      mnemonic,
      gasLimit: 20000000,
      hardfork: "byzantium"
    });
    const web3 = new Web3(provider);
    let accounts;

    before("get accounts", async function() {
      accounts = await web3.eth.getAccounts();
    });

    it("should fail execution", async function() {
      const DummyContract = new web3.eth.Contract(contract.abi);

      let promiEvent = DummyContract.deploy({
        data: contract.bytecode
      }).send({ from: accounts[0], gas: 20000000 });

      let dummyContractInstance = await promiEvent;

      try {
        await dummyContractInstance.methods.test(2).call();
        assert.fail("Call did not fail execution like it was supposed to");
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: invalid opcode");
      }
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

    before("get accounts", async function() {
      accounts = await web3.eth.getAccounts();
    });

    it("should succeed execution", async function() {
      const DummyContract = new web3.eth.Contract(contract.abi);

      let promiEvent = DummyContract.deploy({
        data: contract.bytecode
      }).send({ from: accounts[0], gas: 20000000 });

      let dummyContractInstance = await promiEvent;

      let result = await dummyContractInstance.methods.test(2).call();
      assert(result, "successful execution");
    });
  });
});
