import assert from "assert";
import GetProvider from "./helpers/getProvider";
import sleep from "./helpers/sleep";

describe("ledger", () => {
  let provider: any;
  let accounts: string[];

  beforeEach(async () => {
    provider = GetProvider();
    accounts = await provider.request("eth_accounts");
  })

  it("eth_blockNumber", async () => {
    const blockNumber = parseInt(await provider.request("eth_blockNumber"), 10);
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const nextBlockNumber = await provider.request("eth_blockNumber");
    assert.equal(blockNumber, nextBlockNumber - 1);
  }).timeout(4000);

  it("eth_getBlockByNumber", async () => {
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const blocks = await Promise.all([
      provider.request("eth_getBlockByNumber", ["0x1", true]),
      provider.request("eth_getBlockByNumber", ["0x1"])
    ]);
    assert(blocks[0].hash, blocks[1].hash);
  });

  it("eth_getBlockByHash", async () => {
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const block = await provider.request("eth_getBlockByNumber", ["0x1"]);

    const blocks = await Promise.all([
      provider.request("eth_getBlockByHash", [block.hash, true]),
      provider.request("eth_getBlockByHash", [block.hash])
    ]);
    assert(blocks[0].hash, blocks[1].hash);
    const counts = await Promise.all([
      provider.request("eth_getBlockTransactionCountByNumber", ["0x1"]),
      provider.request("eth_getBlockTransactionCountByHash", [blocks[0].hash])
    ]);

    assert(true);
  });

  it("eth_getBlockTransactionCountByHash", async () => {
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const block = await provider.request("eth_getBlockByNumber", ["0x1"]);

    const count = await provider.request("eth_getBlockTransactionCountByHash", [block.hash]);
    assert(count, "1");
  });

  it("eth_getBlockTransactionCountByNumber", async () => {
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();

    const count = await provider.request("eth_getBlockTransactionCountByNumber", ["0x1"]);
    assert(count, "1");
  });

  it("eth_getTransactionByBlockNumberAndIndex", async () => {
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();

    const tx = await provider.request("eth_getTransactionByBlockNumberAndIndex", ["0x1", "0x0"]);
    assert.equal(
      tx.hash,
      "0x6a530e6b86c00b7bef84fd75d570627d46a4b982f8a573ef1129780b5f92ff7e",
      "Unexpected transaction hash."
    );
  });

  it("eth_getTransactionByBlockHashAndIndex", async () => {
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const block = await provider.request("eth_getBlockByNumber", ["0x1"]);

    const tx = await provider.request("eth_getTransactionByBlockHashAndIndex", [block.hash, "0x0"]);
    assert.equal(
      tx.hash,
      "0x6a530e6b86c00b7bef84fd75d570627d46a4b982f8a573ef1129780b5f92ff7e",
      "Unexpected transaction hash."
    );
  });

  it("eth_getUncleCountByBlockHash", async () => {
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();
    const block = await provider.request("eth_getBlockByNumber", ["0x1"]);

    const count = await provider.request("eth_getUncleCountByBlockHash", [block.hash]);
    assert(count, "0");
  });

  it("eth_getUncleCountByBlockNumber", async () => {
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();

    const count = await provider.request("eth_getUncleCountByBlockNumber", ["0x1"]);
    assert(count, "0");
  });

  it("eth_getTransactionReceipt", async () => {
    const hash = await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();

    const receipt = await provider.request("eth_getTransactionReceipt", [hash]);
    assert(receipt.transactionIndex, "0x0");
  });

  it("eth_getTransactionByHash", async () => {
    const hash = await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    // TODO: remove and replace with something that detects with the block is "mined"
    await sleep();

    const tx = await provider.request("eth_getTransactionByHash", [hash]);
    assert(tx.transactionIndex, "0x0");
  });
});
