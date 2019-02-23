var Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");

describe.only("trie", function() {
  it("should work", async() => {
    const blockNumber = 7255067;

    const Web3 = require("web3");
    var web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/metamask"));
    const blockjson = await web3.eth.getBlock(blockNumber, true);

    const unlockedAccounts = blockjson.transactions.map((tx) => {
      return tx.from;
    });

    const provider = Ganache.provider({
      timestamp: blockjson.timestamp,
      gasLimit: blockjson.gasLimit,
      gasPrice: blockjson.gasPrice,
      fork: "https://mainnet.infura.io/metamask",
      fork_block_number: blockNumber - 1,
      unlocked_accounts: unlockedAccounts
    });
    const send = require("util").promisify(provider.send.bind(provider));

    await send({
      id: `${new Date().getTime()}`,
      jsonrpc: "2.0",
      method: "miner_stop"
    });

    const pendingResults = blockjson.transactions.map(async(tx) => {
      const value = send({
        id: `${new Date().getTime()}`,
        jsonrpc: "2.0",
        method: "eth_sendTransaction",
        params: [tx]
      });
      return value;
    });
    const results = await Promise.all(pendingResults);
    console.log(results);

    await send({
      id: `${new Date().getTime()}`,
      jsonrpc: "2.0",
      method: "evm_mine"
    });

    const block = await send({
      id: `${new Date().getTime()}`,
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: ["0x" + blockNumber.toString(16), true]
    });

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
