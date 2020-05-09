import assert from "assert";
import GetProvider from "./helpers/getProvider";
import EthereumProvider from "@ganache/ethereum/src/provider";

describe("ledger", () => {
  let provider: EthereumProvider;
  let accounts: string[];

  beforeEach(async () => {
    provider = GetProvider();
    accounts = await provider.request("eth_accounts");
  });

  it("eth_blockNumber", async () => {
    const blockNumber = await provider.request("eth_blockNumber");
    const _subscriptionId = await provider.request("eth_subscribe", ["newHeads"]);
    const _txHash = await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);

    const _message = await provider.once("message");
    const nextBlockNumber = await provider.request("eth_blockNumber");
    assert.strictEqual(parseInt(blockNumber, 10), nextBlockNumber - 1);
  });

  it("eth_getBlockByNumber", async () => {
    const _subscriptionId = await provider.request("eth_subscribe", ["newHeads"]);
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    const _message = await provider.once("message");
    const blocks = await Promise.all([
      provider.request("eth_getBlockByNumber", ["0x1", true]),
      provider.request("eth_getBlockByNumber", ["0x1"])
    ]);
    assert(blocks[0].hash, blocks[1].hash);
  });

  it("eth_getBlockByHash", async () => {
    const _subscriptionId = await provider.request("eth_subscribe", ["newHeads"]);
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    const _message = await provider.once("message");
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
    const _subscriptionId = await provider.request("eth_subscribe", ["newHeads"]);
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    const _message = await provider.once("message");
    const block = await provider.request("eth_getBlockByNumber", ["0x1"]);

    const count = await provider.request("eth_getBlockTransactionCountByHash", [block.hash]);
    assert(count, "1");
  });

  it("eth_getBlockTransactionCountByNumber", async () => {
    const _subscriptionId = await provider.request("eth_subscribe", ["newHeads"]);
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    const _message = await provider.once("message");

    const count = await provider.request("eth_getBlockTransactionCountByNumber", ["0x1"]);
    assert(count, "1");
  });

  it("eth_getTransactionByBlockNumberAndIndex", async () => {
    const _subscriptionId = await provider.request("eth_subscribe", ["newHeads"]);
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    const _message = await provider.once("message");

    const tx = await provider.request("eth_getTransactionByBlockNumberAndIndex", ["0x1", "0x0"]);
    assert.equal(
      tx.hash,
      "0x6a530e6b86c00b7bef84fd75d570627d46a4b982f8a573ef1129780b5f92ff7e",
      "Unexpected transaction hash."
    );
  });

  it("eth_getTransactionByBlockHashAndIndex", async () => {
    const _subscriptionId = await provider.request("eth_subscribe", ["newHeads"]);
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    const _message = await provider.once("message");
    const block = await provider.request("eth_getBlockByNumber", ["0x1"]);

    const tx = await provider.request("eth_getTransactionByBlockHashAndIndex", [block.hash, "0x0"]);
    assert.equal(
      tx.hash,
      "0x6a530e6b86c00b7bef84fd75d570627d46a4b982f8a573ef1129780b5f92ff7e",
      "Unexpected transaction hash."
    );
  });

  it("eth_getUncleCountByBlockHash", async () => {
    const _subscriptionId = await provider.request("eth_subscribe", ["newHeads"]);
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    const _message = await provider.once("message");
    const block = await provider.request("eth_getBlockByNumber", ["0x1"]);

    const count = await provider.request("eth_getUncleCountByBlockHash", [block.hash]);
    assert(count, "0");
  });

  it("eth_getUncleCountByBlockNumber", async () => {
    const _subscriptionId = await provider.request("eth_subscribe", ["newHeads"]);
    await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    const _message = await provider.once("message");

    const count = await provider.request("eth_getUncleCountByBlockNumber", ["0x1"]);
    assert(count, "0");
  });

  it("eth_getTransactionReceipt", async () => {
    const _subscriptionId = await provider.request("eth_subscribe", ["newHeads"]);
    const hash = await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    const _message = await provider.once("message");

    const receipt = await provider.request("eth_getTransactionReceipt", [hash]);
    assert(receipt.transactionIndex, "0x0");
  });

  it("eth_getTransactionByHash", async () => {
    const _subscriptionId = await provider.request("eth_subscribe", ["newHeads"]);
    const hash = await provider.request("eth_sendTransaction", [
      {
        from: accounts[0],
        to: accounts[1],
        value: 1
      }
    ]);
    const _message = await provider.once("message");

    const tx = await provider.request("eth_getTransactionByHash", [hash]);
    assert(tx.transactionIndex, "0x0");
  });
});
