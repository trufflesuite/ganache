const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const genSend = require("./helpers/utils/rpc");

describe.only("trie", function() {
  it("should work", async() => {
    const blockNumber = 7255067;

    const Web3 = require("web3");
    const web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/metamask"));
    const blockjson = await web3.eth.getBlock(blockNumber, true);

    const unlockedAccounts = blockjson.transactions.map((tx) => tx.from);

    const provider = Ganache.provider({
      timestamp: blockjson.timestamp,
      gasLimit: blockjson.gasLimit,
      gasPrice: blockjson.gasPrice,
      fork: "https://mainnet.infura.io/metamask",
      fork_block_number: blockNumber - 1,
      unlocked_accounts: unlockedAccounts
    });
    const send = genSend(provider);

    await send("miner_stop");

    const pendingResults = blockjson.transactions.map((tx) => send("eth_sendTransaction", tx));
    const results = await Promise.all(pendingResults);
    console.log(results);

    await send("evm_mine");

    const block = await send("eth_getBlockByNumber", `0x${blockNumber.toString(16)}`, true);

    console.log(
      block.result.transactionsRoot === blockjson.transactionsRoot,
      block.result.transactionsRoot,
      blockjson.transactionsRoot
    );
    console.log(
      block.result.receiptsRoot === blockjson.receiptsRoot,
      block.result.receiptsRoot,
      blockjson.receiptsRoot
    );
    console.log(block);
  });
});
