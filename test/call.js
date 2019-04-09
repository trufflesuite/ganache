const assert = require("assert");
const bootstrap = require("./helpers/contract/bootstrap");

describe("eth_call", function() {
  let context;

  before("Setting up web3 and contract", async function() {
    this.timeout(10000);
    const contractRef = {
      contractFiles: ["EstimateGas"],
      contractSubdirectory: "gas"
    };

    context = await bootstrap(contractRef);
  });

  it("should use the block gas limit if no gas limit is specified", async function() {
    const { accounts, instance } = context;

    const name = "0x54696d"; // Byte code for "Tim"
    const description = "0x4120677265617420677579"; // Byte code for "A great guy"
    const value = 5;

    // this call uses more than the default transaction gas limit and will
    // therefore fail if the block gas limit isn't used for calls
    const status = await instance.methods.add(name, description, value).call({ from: accounts[0] });

    assert.strictEqual(status, true);
  });
});
