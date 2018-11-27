var ethers = require("ethers");
var assert = require("assert");
var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../public-exports.js");

const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

describe("ethers", function(done) {
  const g = Ganache.provider({ mnemonic });
  const provider = new ethers.providers.Web3Provider(g);
  let wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);

  it("should test ethers.js", async() => {
    let tx = await wallet.sendTransaction({
      to: "0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290",
      value: 1
    });
    assert(tx != null);
  });
});
