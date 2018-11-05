const Web3 = require("web3");
const assert = require("assert");
const Ganache = require("../index");
const path = require("path");
const compileAndDeploy = require("./helpers/contracts").compileAndDeploy;

const TARGET = process.env.TARGET || "ganache";
const PARITY_UNLOCKED_ADDR = process.env.PARITY_UNLOCKED_ADDR || "0x00a329c0648769A73afAc7F9381E08FB43dBEA72";
const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

function setUp(options = { mnemonic }, contractName = "BlockGasLimit") {
  const context = {
    options: options,
    provider: null,
    web3: null,
    accounts: [],
    contractArtifact: {},
    instance: null
  };

  before("setup web3", async function() {
    // Enable Ganache provider
    if (TARGET === "ganache") {
      // eslint-disable-next-line new-cap
      context.provider = new Ganache.provider(context.options);
      context.options.blockTime = 2000;
      context.web3 = new Web3(context.provider);
    }

    // Enable Geth provider
    if (TARGET === "geth") {
      context.options.blockTime = 2000;
      context.provider = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
      context.web3 = new Web3(context.provider);
    }

    // Enable Parity provider
    if (TARGET === "parity") {
      context.options.blockTime = 2000;
      context.provider = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
      context.web3 = new Web3(context.provider);

      const response = await context.web3.eth.personal.unlockAccount(PARITY_UNLOCKED_ADDR, "", null);
      assert.strictEqual(response, true);
    }
  });

  before("compile source", async function() {
    this.timeout(10000);
    context.contractArtifact = await compileAndDeploy(path.join(__dirname, ".", `${contractName}.sol`),
      contractName,
      context.web3
    );
    context.instance = context.contractArtifact.instance;
  });
  return context;
}

describe("Specifying a sender gas limit greater than block gas limitations", function() {
  const context = setUp();
  const iterations = 10 ** 6;
  const clientGasLimit = 10 ** 8;

  it("when calling a 'view' function should generate a block gas limit error", async function() {
    const block = await context.web3.eth.getBlock("latest");

    const isVeryHighGasLimit = clientGasLimit > block.gasLimit && clientGasLimit < Number.MAX_SAFE_INTEGER;
    assert.strictEqual(isVeryHighGasLimit, true);

    try {
      // Attempt to run an expensive view function
      await context.instance.methods.expensiveOperation(iterations).call({ gas: clientGasLimit });
      assert.fail("Expecting a block gas limit error when executing a expensive 'view' function");
    } catch (error) {
      assert.strictEqual(error.message, "Exceeds block gas limit");
    }
  });

  it("when calling a 'pure' function should generate a block gas limit error", async function() {
    const block = await context.web3.eth.getBlock("latest");

    const isVeryHighGas = clientGasLimit > block.gasLimit && clientGasLimit < Number.MAX_SAFE_INTEGER;
    assert.strictEqual(isVeryHighGas, true);

    try {
      await context.instance.methods.pureExpensiveOperation(iterations).call({ gas: clientGasLimit });
      assert.fail("Expecting a block gas limit error when executing a expensive 'pure' function");
    } catch (error) {
      assert.strictEqual(error.message, "Exceeds block gas limit");
    }
  });

  // Enable if running a Geth or Parity node
  // eslint-disable-next-line max-len
  it.skip("GETH/PARITY ONLY: when calling a 'pure' function does NOT generate a block gas limit error", async function() {
    const block1 = await context.web3.eth.getBlock("latest");

    const status = await context.instance.methods.pureExpensiveOperation(iterations).call({
      gas: clientGasLimit
    });

    const block2 = await context.web3.eth.getBlock("latest");

    assert.strictEqual(block1.number, block2.number);
    assert.strictEqual(status, true);
  });

  // Enable if running a Geth or Parity node
  // eslint-disable-next-line max-len
  it.skip("GETH/PARITY ONLY: when calling a 'view' function does NOT generate a block gas limit error", async function() {
    try {
      // Attempt to run an expensive view function
      await context.instance.methods.expensiveOperation(iterations).call({ gas: clientGasLimit });
      assert.fail("Expecting a block gas limit error when executing a expensive 'view' function");
    } catch (error) {
      assert.strictEqual(error.message, "Expecting a block gas limit error when executing a expensive 'view' function");
    }
  });
});
