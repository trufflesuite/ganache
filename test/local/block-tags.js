const assert = require("assert");
const initializeTestProvider = require("../helpers/web3/initializeTestProvider");
const compile = require("../helpers/contract/singleFileCompile");

describe("Block Tags", function() {
  let context;
  const initialState = {};

  before("Setting up web3", async function() {
    this.timeout(10000);

    const options = {
      mnemonic: "candy maple velvet cake sugar cream honey rich smooth crumble sweet treat",
      time: new Date(0) // Testing features that rely on determinate conditions
    };

    context = await initializeTestProvider(options);
  });

  before("Stop automatic miner", async function() {
    await context.send("miner_stop");
  });

  before("Get initial balance, nonce and block number", async function() {
    const { accounts, web3 } = context;

    const results = [
      web3.eth.getBalance(accounts[0]),
      web3.eth.getTransactionCount(accounts[0]),
      web3.eth.getBlockNumber()
    ];

    const [balance, nonce, blockNumber] = await Promise.all(results);

    Object.assign(initialState, {
      balance,
      blockNumber,
      nonce
    });
  });

  before("Make a transaction that changes the balance, code and nonce", async function() {
    const { accounts, web3 } = context;
    const { result } = compile("./test/contracts/examples/", "Example");
    const contractPromise = web3.eth.sendTransaction({
      from: accounts[0],
      data: "0x" + result.contracts["Example.sol"].Example.evm.bytecode.object,
      gas: 3141592
    });
    contractPromise.on("transactionHash", () => {
      context.send("evm_mine", 1);
    });
    const { contractAddress } = await contractPromise;

    initialState.contractAddress = contractAddress;
  });

  it("should return the initial nonce at the previous block number", async function() {
    const { accounts, web3 } = context;
    const { blockNumber, nonce } = initialState;
    let testNonce = await web3.eth.getTransactionCount(accounts[0], blockNumber);
    assert.strictEqual(testNonce, nonce);

    // Check that the nonce incremented with the block number, just to be sure.
    testNonce = await web3.eth.getTransactionCount(accounts[0], blockNumber + 1);
    assert.strictEqual(testNonce, nonce + 1);
  });

  it("should return the initial balance at the previous block number", async function() {
    const { accounts, web3 } = context;
    const { balance, blockNumber } = initialState;
    let testBalance = await web3.eth.getBalance(accounts[0], blockNumber);
    assert.strictEqual(testBalance, balance);

    // Check that the balance incremented with the block number, just to be sure.
    testBalance = await web3.eth.getBalance(accounts[0], blockNumber + 1);
    const initialBalanceInEther = parseFloat(web3.utils.fromWei(balance, "ether"));
    const balanceInEther = parseFloat(web3.utils.fromWei(testBalance, "ether"));
    assert(balanceInEther < initialBalanceInEther);
  });

  it("should return the no code at the previous block number", async function() {
    const { web3 } = context;
    const { contractAddress, blockNumber } = initialState;

    let code = await web3.eth.getCode(contractAddress, blockNumber);
    assert.strictEqual(code, "0x");

    // Check that the code incremented with the block number, just to be sure.
    code = await web3.eth.getCode(contractAddress, blockNumber + 1);
    assert.notStrictEqual(code, "0x");
    assert(code.length > 20); // Just because we don't know the actual code we're supposed to get back
  });

  it("should produce correct tx and receipt root when the block contains 1 (or more) tx's", async function() {
    const { web3 } = context;
    const { blockNumber } = initialState;

    const block = await web3.eth.getBlock(blockNumber + 1, false);
    assert.strictEqual(block.transactions.length, 1, "should have one tx in the block.");
    assert.notStrictEqual(block.transactionsRoot, block.receiptsRoot, "Trie roots should not be equal.");
    assert.strictEqual(
      block.transactionsRoot,
      "0x1d790d78fb45a013f23735cdb280258bd773392ea52913c939ed48eb916362db",
      "Should produce correct transactionsRoot"
    );
    assert.strictEqual(
      block.receiptsRoot,
      "0x9b620919250d3ae8b3096dcda9152491c92f98ca0e7a8cfc756a46a88e49156a",
      "Should produce correct receiptsRoot"
    );
  });
});
