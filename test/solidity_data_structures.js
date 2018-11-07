const Web3 = require("web3");
const assert = require("assert");
const Ganache = require("../index");
const path = require("path");
const compileAndDeploy = require("./helpers/contracts").compileAndDeploy;

const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

function setUp(options = { mnemonic }, contractName = "DynamicStringLength") {
  const context = {
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

describe("Solidity variable string length", function() {
  const context = setUp();
  it("replacing a long string with a short string", async function() {
    let response;
    const text = "1234567890".repeat(13);
    const gas = 500000;

    const addresses = await context.web3.eth.getAccounts();
    await context.instance.methods.set(text).send({ from: addresses[0], gas });
    response = await context.instance.methods.testString().call();
    assert.strictEqual(response, text);

    const text2 = "123";
    await context.instance.methods.set(text2).send({ from: addresses[0] });
    response = await context.instance.methods.testString().call();
    assert.strictEqual(response, text2);
  });
});
