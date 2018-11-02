const Web3 = require("web3");
const assert = require("assert");
const Ganache = require("../index");
const path = require("path");
const compileAndDeploy = require("./helpers/contracts").compileAndDeploy;

const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

function setUp(options = { mnemonic }, contractName = "BlockGasLimit") {
  let context = {
    options: options,
    provider: null,
    web3: null,
    accounts: [],
    contractArtifact: {},
    instance: null
  };

  before("setup web3", async function() {
    // eslint-disable-next-line new-cap
    context.provider = new Ganache.provider(context.options);

    // context.provider = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    context.options.blockTime = 2000;
    context.web3 = new Web3(context.provider);
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

describe("Exceeding block gas limitations", function() {
  let context = setUp();
  let iterations = 10 ** 6;
  let clientGasLimit = 10 ** 8;

  it("when calling a 'view' function should generate an error", async function() {
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

  it("when calling a 'pure' function should generate an error", async function() {
    const block = await context.web3.eth.getBlock("latest");

    const isVeryHighGas = clientGasLimit > block.gasLimit && clientGasLimit < Number.MAX_SAFE_INTEGER;
    assert.strictEqual(isVeryHighGas, true);

    try {
      await context.instance.methods.pureExpensiveOperationPure(iterations).call({ gas: clientGasLimit });
      assert.fail("Expecting a block gas limit error when executing a expensive 'pure' function");
    } catch (error) {
      assert.strictEqual(error.message, "Exceeds block gas limit");
    }
  });
});
