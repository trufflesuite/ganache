const assert = require("assert");
const { BN } = require("ethereumjs-util");
const ethers = require("ethers");
const intializeTestProvider = require("./helpers/web3/initializeTestProvider");

describe("ethers", async() => {
  let ethersProvider, wallet, gasPrice, value;
  const secretKey = "46".repeat(32);

  before("Setting up ethers wallet provider", async function() {
    this.timeout(10000);
    const ganacheOptions = {
      accounts: [
        {
          secretKey: `0x${secretKey}`,
          balance: `0x${new BN("1000000000000000000000").toString("hex")}`
        }
      ]
    };

    const { provider } = await intializeTestProvider(ganacheOptions);

    ethersProvider = new ethers.providers.Web3Provider(provider);
    const privateKey = Buffer.from(secretKey, "hex");
    wallet = new ethers.Wallet(privateKey);
    gasPrice = 20 * 10 ** 9; // 20000000000
    value = `0x${new BN(10).pow(new BN(18)).toString("hex")}`;
  });

  it("ether.js transaction hash matches ganache transaction hash for chainId 1", async() => {
    // This tx mostly matches EIP-155 example except for the nonce
    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
    const transaction = {
      nonce: 0,
      to: `0x${"35".repeat(20)}`,
      gasPrice,
      gasLimit: 21000,
      value: value,
      data: "",
      chainId: 1 // EIP 155 chainId - mainnet: 1, ropsten: 3
    };
    const signedTransaction = await wallet.sign(transaction);
    const ethersTxHash = ethers.utils.keccak256(signedTransaction);

    const { hash } = await ethersProvider.sendTransaction(signedTransaction);
    assert.deepStrictEqual(hash, ethersTxHash, "Transaction hash doesn't match etherjs signed transaction hash");
  });

  it("ether.js transaction hash matches ganache transaction hash for auto chainId", async() => {
    // This tx mostly matches EIP-155 example except for the nonce and chainId
    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
    const transaction = {
      nonce: 1,
      to: `0x${"35".repeat(20)}`,
      gasPrice,
      gasLimit: 21000,
      value: value,
      data: ""
    };
    const signedTransaction = await wallet.sign(transaction);
    const ethersTxHash = ethers.utils.keccak256(signedTransaction);

    const { hash } = await ethersProvider.sendTransaction(signedTransaction);
    assert.deepStrictEqual(hash, ethersTxHash, "Transaction hash doesn't match etherjs signed transaction hash");
  });
});
