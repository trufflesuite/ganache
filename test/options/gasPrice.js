const to = require("../../lib/utils/to");
const Web3 = require("web3");
const assert = require("assert");
const Ganache = require("../../index");
const path = require("path");

const compileAndDeploy = require("../helpers/contracts").compileAndDeploy;

const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

function setUp(options = { mnemonic }, contractName = "Example") {
  let context = {
    options: options,
    provider: null,
    web3: null,
    accounts: [],
    contractArtifact: {},
    instance: null
  };

  before("setup web3", async function() {
    context.provider = Ganache.provider(context.options);
    context.web3 = new Web3(context.provider);
  });

  before("get accounts", async function() {
    context.accounts = await context.web3.eth.getAccounts();
  });

  before("compile source", async function() {
    this.timeout(10000);
    context.contractArtifact = await compileAndDeploy(
      path.join(__dirname, "..", `${contractName}.sol`),
      contractName,
      context.web3
    );
    context.instance = context.contractArtifact.instance;
  });

  return context;
}

describe("options:gasPrice", function() {
  describe("default gasPrice", function() {
    let context = setUp();

    it("should respect the default gasPrice", async function() {
      let assignedGasPrice = context.provider.engine.manager.state.gasPriceVal;

      let receipt = await context.instance.methods.setValue("0x10").send({ from: context.accounts[0], gas: 3141592 });

      let transactionHash = receipt.transactionHash;
      let tx = await context.web3.eth.getTransaction(transactionHash);
      let gasPrice = tx.gasPrice;

      assert.deepStrictEqual(to.hex(gasPrice), to.hex(assignedGasPrice));
    });
  });

  describe("zero gasPrice", function() {
    let context = setUp({ mnemonic, gasPrice: 0 });

    it("should be possible to set a zero gas price", async function() {
      let assignedGasPrice = context.provider.engine.manager.state.gasPriceVal;

      assert.deepStrictEqual(to.hex(assignedGasPrice), "0x0");

      let receipt = await context.instance.methods.setValue("0x10").send({ from: context.accounts[0], gas: 3141592 });

      let transactionHash = receipt.transactionHash;
      let tx = await context.web3.eth.getTransaction(transactionHash);
      let gasPrice = tx.gasPrice;

      assert.deepStrictEqual(to.hex(gasPrice), to.hex(assignedGasPrice));
    });
  });
});
