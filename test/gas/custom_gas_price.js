const assert = require("assert");
const getWeb3 = require("../helpers/web3/getWeb3");

describe("Custom Gas Price", () => {
  it("should return gas price of 15 when specified as a decimal", async() => {
    const options = {
      gasPrice: 15
    };
    const { web3 } = await getWeb3(options);
    const result = await web3.eth.getGasPrice();
    assert.strictEqual(parseInt(result), 15);
  });

  it("should return gas price of 15 when specified as hex", async() => {
    const options = {
      gasPrice: 0xf
    };
    const { web3 } = await getWeb3(options);
    const result = await web3.eth.getGasPrice();
    assert.strictEqual(parseInt(result), 15);
  });
});
