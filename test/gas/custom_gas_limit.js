const assert = require("assert");
const getWeb3 = require("../helpers/web3/getWeb3");

describe("Custom Gas Limit", () => {
  it("The block should show the correct custom Gas Limit", async() => {
    const options = { gasLimit: 5000000 };
    const { web3 } = await getWeb3(options);
    const { gasLimit } = await web3.eth.getBlock(0);

    assert.deepStrictEqual(gasLimit, 5000000);
  });
});
