const Web3 = require("web3");
const assert = require("assert");
const Ganache = require("../index");
const path = require("path");
const compileAndDeploy = require("./helpers/contracts").compileAndDeploy;

const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

function setUp(options = { mnemonic }, contractName = "DynamicStrings") {
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
    context.contractArtifact = await compileAndDeploy(
      path.join(__dirname, ".", `${contractName}.sol`),
      contractName,
      context.web3
    );
    context.instance = context.contractArtifact.instance;
  });
  return context;
}

describe("Array of Structures", function() {
  const context = setUp();
  it("can add Structs to an Array", async function() {
    this.timeout(10000);
    const myGuid = "Payment1";
    const paymentIndex = 0;
    const account = "0x627306090abab3a6e1400e9345bc60c78a8bef57";
    const amount = 10;
    const gas = 5000000;
    const iterations = 100;

    let response = await context.instance.methods.payForSomething(myGuid).send({
      from: account,
      value: amount,
      gas: gas
    });

    assert.strictEqual(response.events.PaymentPlaced.returnValues.guid, myGuid);
    assert.strictEqual(account, response.events.PaymentPlaced.returnValues.senderAddress.toLowerCase());
    assert.strictEqual(parseInt(response.events.PaymentPlaced.returnValues.blockNumber), 2);
    assert.strictEqual(parseInt(response.events.PaymentPlaced.returnValues.payIndex), 0);

    await context.instance.methods.changeSomething(paymentIndex).call();

    for (let i = 0; i < iterations; i++) {
      const response = await context.instance.methods.payForSomething(myGuid).send({
        from: account,
        value: amount,
        gas: gas
      });

      assert.strictEqual(response.events.PaymentPlaced.returnValues.guid, myGuid);
      assert.strictEqual(account, response.events.PaymentPlaced.returnValues.senderAddress.toLowerCase());
      assert.strictEqual(parseInt(response.events.PaymentPlaced.returnValues.blockNumber), i + 3);
      assert.strictEqual(parseInt(response.events.PaymentPlaced.returnValues.payIndex), i + 1);
    }
  });
});
