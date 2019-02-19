const assert = require("assert");
const ethers = require("ethers");
const Ganache = require(process.env.TEST_BUILD
  ? "../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../index.js");

describe("ethers", async() => {
  const secretKey = "46".repeat(32);
  const ganache = Ganache.provider({
    accounts: [
      {
        secretKey: `0x${secretKey}`,
        balance: 10 ** 21
      }
    ]
  });

  const privateKey = Buffer.from(secretKey, "hex");
  const wallet = new ethers.Wallet(privateKey);
  const provider = new ethers.providers.Web3Provider(ganache);

  it("ether.js transaction hash matches ganache transaction hash for chainId 1", async() => {
    // This tx mostly matches EIP-155 example except for the nonce
    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
    const transaction = {
      nonce: 0,
      to: `0x${"35".repeat(20)}`,
      gasPrice: 2e10,
      gasLimit: 21000,
      value: 1e18,
      data: "",
      chainId: 1 // EIP 155 chainId - mainnet: 1, ropsten: 3
    };
    const signedTransaction = await wallet.sign(transaction);
    const ethersTxHash = ethers.utils.keccak256(signedTransaction);

    const { hash } = await provider.sendTransaction(signedTransaction);
    assert.deepStrictEqual(hash, ethersTxHash, "Transaction hash doesn't match etherjs signed transaction hash");
  });

  it("ether.js transaction hash matches ganache transaction hash for auto chainId", async() => {
    // This tx mostly matches EIP-155 example except for the nonce and chainId
    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
    const transaction = {
      nonce: 1,
      to: `0x${"35".repeat(20)}`,
      gasPrice: 2e10,
      gasLimit: 21000,
      value: 1e18,
      data: ""
    };
    const signedTransaction = await wallet.sign(transaction);
    const ethersTxHash = ethers.utils.keccak256(signedTransaction);

    const { hash } = await provider.sendTransaction(signedTransaction);
    assert.deepStrictEqual(hash, ethersTxHash, "Transaction hash doesn't match etherjs signed transaction hash");
  });
});
