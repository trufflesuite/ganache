var ethers = require("ethers");
var assert = require("assert");
var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");

const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

describe("ethers", async(done) => {
  const g = Ganache.provider({ mnemonic });
  const provider = new ethers.providers.Web3Provider(g);
  const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);

  it("ether.js transaction hash matches ganache transaction hash", async() => {
    const transaction = {
      to: "0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290",
      gasPrice: 2000000,
      gasLimit: 21000,
      value: 1,
      nonce: 0,
      chainId: Date.now()
    };
    const signedTransaction = await wallet.sign(transaction);
    const ethersTxHash = ethers.utils.keccak256(signedTransaction);

    const txHash = await provider.sendTransaction(signedTransaction);
    assert.deepStrictEqual(txHash.hash, ethersTxHash, "Transaction hash doesn't match etherjs signed transaction hash");
  });
});
