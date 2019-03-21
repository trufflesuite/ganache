const assert = require("assert");
const to = require("../lib/utils/to.js");
const initializeTestProvider = require("./helpers/web3/initializeTestProvider");

describe("Transaction Ordering", function() {
  let context;

  before("Setting up accounts and provider", async function() {
    context = await initializeTestProvider();
    context.sendTransaction = (txData) =>
      new Promise((resolve) => context.web3.eth.sendTransaction(txData).on("transactionHash", resolve));
  });

  beforeEach(async function() {
    await context.send("miner_stop");
  });

  afterEach(async function() {
    await context.send("miner_start", 1);
  });

  it("should order queued transactions correctly by nonce before adding to the block", async function() {
    const { accounts, send, web3, sendTransaction } = context;

    const txData = {
      to: accounts[1],
      from: accounts[0],
      value: 0x1,
      nonce: 0,
      gas: 21000
    };

    await sendTransaction(txData);

    txData.nonce = 1;
    await sendTransaction(txData);

    await send("miner_start", 1);

    const block = await web3.eth.getBlock("latest");
    assert.strictEqual(block.transactions.length, 2, "Latest block should have two transactions");
  });

  it("should order queued transactions correctly by price before adding to the block", async function() {
    const { accounts, send, web3, sendTransaction } = context;

    const txData = {
      to: accounts[1],
      from: accounts[0],
      value: 0x1,
      gas: 21000,
      gasPrice: 0x1
    };

    await sendTransaction(txData);

    txData.gasPrice = 2;
    txData.from = accounts[1];
    await sendTransaction(txData);

    send("miner_start", 1);

    const block = await web3.eth.getBlock("latest", true);
    assert.strictEqual(block.transactions.length, 2, "Latest block should have two transactions");
    assert.strictEqual(to.number(block.transactions[0].gasPrice), 2);
    assert.strictEqual(to.number(block.transactions[1].gasPrice), 1);
  });
});
