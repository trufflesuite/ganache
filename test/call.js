const assert = require("assert");
const bootstrap = require("./helpers/contract/bootstrap");

describe("eth_call", function() {
  it("should use the call gas limit if no call gas limit is specified in the call", async function() {
    const contractRef = {
      contractFiles: ["EstimateGas"],
      contractSubdirectory: "gas"
    };
    let context;

    context = await bootstrap(contractRef, {
      callGasLimit: "0x6691b7"
    });
    const { accounts, instance } = context;

    const name = "0x54696d"; // Byte code for "Tim"
    const description = "0x4120677265617420677579"; // Byte code for "A great guy"
    const value = 5;

    // this call uses more than the default transaction gas limit and will
    // therefore fail if the block gas limit isn't used for calls
    const status = await instance.methods.add(name, description, value).call({ from: accounts[0] });

    assert.strictEqual(status, true);
  });

  it("should use maxUInt64 call gas limit if no gas limit is specified in the provider or the call", async function() {
    const contractRef = {
      contractFiles: ["EstimateGas"],
      contractSubdirectory: "gas"
    };
    let context;

    context = await bootstrap(contractRef);
    const { accounts, instance } = context;

    const name = "0x54696d"; // Byte code for "Tim"
    const description = "0x4120677265617420677579"; // Byte code for "A great guy"
    const value = 5;

    // this call uses more than the default transaction gas limit and will
    // therefore fail if the maxUInt64 limit isn't used for calls
    const status = await instance.methods.add(name, description, value).call({ from: accounts[0] });

    assert.strictEqual(status, true);
  });

  it("should use the current block number via `eth_call`", async() => {
    const actualBlockNumber = await context.web3.eth.getBlockNumber();
    // should read the block number, too
    const callBlockNumber = await context.instance.methods.currentBlock().call();
    assert.strictEqual(parseInt(callBlockNumber, 10), actualBlockNumber);
  });
});
