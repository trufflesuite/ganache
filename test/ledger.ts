import assert from "assert";
import GetProvider, { Provider } from "./helpers/getProvider";
import sleep from "./helpers/sleep";

describe("ledger", () => {
  let provider: Provider;
  let accounts: string[];

  beforeEach(async () => {
    provider = GetProvider();
    accounts = await provider.send("eth_accounts");
  });

  it("eth_blockNumber", async () => {
    const blockNumber = parseInt(await provider.send("eth_blockNumber"), 10);
    await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const nextBlockNumber = await provider.send("eth_blockNumber");
    assert.equal(blockNumber, nextBlockNumber - 1);
  });

  it("eth_getBlockByNumber", async() => {
    await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const blocks = await Promise.all([provider.send("eth_getBlockByNumber", ["0x1", true]), provider.send("eth_getBlockByNumber", ["0x1"])]);
    assert(blocks[0].hash, blocks[1].hash);
  });

  it("eth_getBlockByHash", async() => {
    await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const block = await provider.send("eth_getBlockByNumber", ["0x1"]);

    const blocks = await Promise.all([provider.send("eth_getBlockByHash", [block.hash, true]), provider.send("eth_getBlockByHash", [block.hash])]);
    assert(blocks[0].hash, blocks[1].hash);
    const counts = await Promise.all([provider.send("eth_getBlockTransactionCountByNumber", ["0x1"]), provider.send("eth_getBlockTransactionCountByHash", [blocks[0].hash])]);

    assert(true);
  });

  it("eth_getBlockTransactionCountByHash", async() => {
    await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const block = await provider.send("eth_getBlockByNumber", ["0x1"]);

    const count = await provider.send("eth_getBlockTransactionCountByHash", [block.hash]);
    assert(count, "1");
  });

  it("eth_getBlockTransactionCountByNumber", async() => {
    await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();

    const count = await provider.send("eth_getBlockTransactionCountByNumber", ["0x1"]);
    assert(count, "1");
  });

  it("eth_getTransactionByBlockNumberAndIndex", async() => {
    await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();

    const tx = await provider.send("eth_getTransactionByBlockNumberAndIndex", ["0x1", "0x0"]);
    assert.equal(tx.hash, "0x6a530e6b86c00b7bef84fd75d570627d46a4b982f8a573ef1129780b5f92ff7e", "Unexpected transaction hash.");
  });

  it("eth_getTransactionByBlockHashAndIndex", async() => {
    await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const block = await provider.send("eth_getBlockByNumber", ["0x1"]);

    const tx = await provider.send("eth_getTransactionByBlockHashAndIndex", [block.hash, "0x0"]);
    assert.equal(tx.hash, "0x6a530e6b86c00b7bef84fd75d570627d46a4b982f8a573ef1129780b5f92ff7e", "Unexpected transaction hash.");
  });

  it("eth_getUncleCountByBlockHash", async() => {
    await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const block = await provider.send("eth_getBlockByNumber", ["0x1"]);

    const count = await provider.send("eth_getUncleCountByBlockHash", [block.hash]);
    assert(count, "0");
  });

  it("eth_getUncleCountByBlockNumber", async() => {
    await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();

    const count = await provider.send("eth_getUncleCountByBlockNumber", ["0x1"]);
    assert(count, "0");
  });

  it("eth_getTransactionReceipt", async() => {
    const hash = await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();

    const receipt = await provider.send("eth_getTransactionReceipt", [hash]);
    assert(receipt.transactionIndex, "0x0");
  });

  it("eth_getTransactionByHash", async() => {
    const hash = await provider.send("eth_sendTransaction", [{
      from: accounts[0],
      to: accounts[1],
      value: 1
    }]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();

    const tx = await provider.send("eth_getTransactionByHash", [hash]);
    assert(tx.transactionIndex, "0x0");
  });
})
