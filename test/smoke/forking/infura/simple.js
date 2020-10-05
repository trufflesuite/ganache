const Web3 = require("web3");
var assert = require("assert");
const Ganache = require(process.env.TEST_BUILD
  ? "../../../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../../../index.js");

const logger = {
  log: function(msg) {
    /* console.log(msg) */
  }
};

describe("Simple Infura", () => {
  let INFURA_KEY;

  before(function() {
    if (typeof process.env.INFURA_KEY === "undefined" || process.env.INFURA_KEY === "") {
      this.skip();
    } else {
      INFURA_KEY = process.env.INFURA_KEY;
    }
  });

  it("forks mainnet https", async() => {
    // https://etherscan.io/block/10661638
    const blockHeight = 10661638;
    const numTransactions = 204;
    const network = "mainnet";

    const web3 = new Web3();
    const provider = Ganache.provider({
      fork: `https://${network}.infura.io/v3/${INFURA_KEY}@${blockHeight}`,
      logger
    });
    web3.setProvider(provider);

    const blockHeightAfterFork = await web3.eth.getBlockNumber();
    assert.strictEqual(blockHeightAfterFork, blockHeight + 1);

    const block = await web3.eth.getBlock(blockHeight);
    assert.strictEqual(block.transactions.length, numTransactions);

    await new Promise((resolve) => provider.close(resolve));
  }).timeout(5000);

  it("forks mainnet wss", async() => {
    // https://etherscan.io/block/10661638
    const blockHeight = 10661638;
    const numTransactions = 204;
    const network = "mainnet";

    const web3 = new Web3();
    const provider = Ganache.provider({
      fork: `wss://${network}.infura.io/ws/v3/${INFURA_KEY}@${blockHeight}`,
      logger
    });
    web3.setProvider(provider);

    const blockHeightAfterFork = await web3.eth.getBlockNumber();
    assert.strictEqual(blockHeightAfterFork, blockHeight + 1);

    const block = await web3.eth.getBlock(blockHeight);
    assert.strictEqual(block.transactions.length, numTransactions);

    await new Promise((resolve) => provider.close(resolve));
  }).timeout(5000);

  it("forks goerli https", async() => {
    // https://goerli.etherscan.io/block/3226587
    const blockHeight = 3226587;
    const numTransactions = 1;
    const network = "goerli";

    const web3 = new Web3();
    const provider = Ganache.provider({
      fork: `https://${network}.infura.io/v3/${INFURA_KEY}@${blockHeight}`,
      logger
    });
    web3.setProvider(provider);

    const blockHeightAfterFork = await web3.eth.getBlockNumber();
    assert.strictEqual(blockHeightAfterFork, blockHeight + 1);

    const block = await web3.eth.getBlock(blockHeight);
    assert.strictEqual(block.transactions.length, numTransactions);

    await new Promise((resolve) => provider.close(resolve));
  }).timeout(5000);

  it("forks ropsten https", async() => {
    // https://ropsten.etherscan.io/block/8500030
    const blockHeight = 8500030;
    const numTransactions = 53;
    const network = "ropsten";

    const web3 = new Web3();
    const provider = Ganache.provider({
      fork: `https://${network}.infura.io/v3/${INFURA_KEY}@${blockHeight}`,
      logger
    });
    web3.setProvider(provider);

    const blockHeightAfterFork = await web3.eth.getBlockNumber();
    assert.strictEqual(blockHeightAfterFork, blockHeight + 1);

    const block = await web3.eth.getBlock(blockHeight);
    assert.strictEqual(block.transactions.length, numTransactions);

    await new Promise((resolve) => provider.close(resolve));
  }).timeout(5000);

  it("forks rinkeby https", async() => {
    // https://rinkeby.etherscan.io/block/7019987
    const blockHeight = 7019987;
    const numTransactions = 11;
    const network = "rinkeby";

    const web3 = new Web3();
    const provider = Ganache.provider({
      fork: `https://${network}.infura.io/v3/${INFURA_KEY}@${blockHeight}`,
      logger
    });
    web3.setProvider(provider);

    const blockHeightAfterFork = await web3.eth.getBlockNumber();
    assert.strictEqual(blockHeightAfterFork, blockHeight + 1);

    const block = await web3.eth.getBlock(blockHeight);
    assert.strictEqual(block.transactions.length, numTransactions);

    await new Promise((resolve) => provider.close(resolve));
  }).timeout(5000);

  it("forks kovan https", async() => {
    // https://kovan.etherscan.io/block/20255583
    const blockHeight = 20255583;
    const numTransactions = 3;
    const network = "kovan";

    const web3 = new Web3();
    const provider = Ganache.provider({
      fork: `https://${network}.infura.io/v3/${INFURA_KEY}@${blockHeight}`,
      logger
    });
    web3.setProvider(provider);

    const blockHeightAfterFork = await web3.eth.getBlockNumber();
    assert.strictEqual(blockHeightAfterFork, blockHeight + 1);

    const block = await web3.eth.getBlock(blockHeight);
    assert.strictEqual(block.transactions.length, numTransactions);

    await new Promise((resolve) => provider.close(resolve));
  }).timeout(5000);
});
