var ethers = require("ethers");
var assert = require("assert");
var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");

describe("ethers", async(done) => {
  const secretKey = "4646464646464646464646464646464646464646464646464646464646464646";
  const g = Ganache.provider({
    accounts: [
      {
        secretKey: "0x" + secretKey,
        balance: 1000000000000000000000
      }
    ]
  });
  const privateKey = Buffer.from(secretKey, "hex");
  const wallet = new ethers.Wallet(privateKey);
  const provider = new ethers.providers.Web3Provider(g);

  it("ether.js transaction hash matches ganache transaction hash for chainId 1", async() => {
    // This tx mostly matches EIP-155 example except for the nonce
    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
    const transaction = {
      nonce: 0,
      to: "0x3535353535353535353535353535353535353535",
      gasPrice: 20 * 10 ** 9,
      gasLimit: 21000,
      value: 10 ** 18,
      data: "",
      chainId: 1 // EIP 155 chainId - mainnet: 1, ropsten: 3
    };
    const signedTransaction = await wallet.sign(transaction);
    const ethersTxHash = ethers.utils.keccak256(signedTransaction);

    const txHash = await provider.sendTransaction(signedTransaction);
    assert.deepStrictEqual(txHash.hash, ethersTxHash, "Transaction hash doesn't match etherjs signed transaction hash");
  });

  it("ether.js transaction hash matches ganache transaction hash for auto chainId", async() => {
    // This tx mostly matches EIP-155 example except for the nonce and chainId
    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
    const transaction = {
      nonce: 1,
      to: "0x3535353535353535353535353535353535353535",
      gasPrice: 20 * 10 ** 9,
      gasLimit: 21000,
      value: 10 ** 18,
      data: ""
    };
    const signedTransaction = await wallet.sign(transaction);
    const ethersTxHash = ethers.utils.keccak256(signedTransaction);

    const txHash = await provider.sendTransaction(signedTransaction);
    assert.deepStrictEqual(txHash.hash, ethersTxHash, "Transaction hash doesn't match etherjs signed transaction hash");
  });
});
