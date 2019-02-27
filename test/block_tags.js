const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const to = require("../lib/utils/to.js");
const { readFileSync } = require("fs");
const { compile } = require("solc");
const assert = require("assert");
const Web3 = require("web3");

const source = readFileSync("./test/contracts/examples/Example.sol", { encoding: "utf8" });
const result = compile(source, 1);

// Note: Certain properties of the following contract data are hardcoded to
// maintain repeatable tests. If you significantly change the solidity code,
// make sure to update the resulting contract data with the correct values.
const contract = {
  solidity: source,
  abi: result.contracts[":Example"].interface,
  binary: "0x" + result.contracts[":Example"].bytecode,
  position_of_value: "0x0000000000000000000000000000000000000000000000000000000000000000",
  expected_default_value: 5,
  call_data: {
    gas: "0x2fefd8",
    gasPrice: "0x1", // This is important, as passing it has exposed errors in the past.
    to: null, // set by test
    data: "0x3fa4f245"
  },
  transaction_data: {
    from: null, // set by test
    gas: "0x2fefd8",
    to: null, // set by test
    data: "0x552410770000000000000000000000000000000000000000000000000000000000000019" // sets value to 25 (base 10)
  }
};

describe("Block Tags", function() {
  const options = {
    mnemonic: "candy maple velvet cake sugar cream honey rich smooth crumble sweet treat",
    time: new Date(0) // Testing features that rely on determinate conditions
  };
  const web3 = new Web3(Ganache.provider(options));
  const initial = {};
  let accounts;
  let contractAddress;
  let initialBlockNumber;

  before("Gather accounts", async function() {
    accounts = await web3.eth.getAccounts();
  });

  before("Get initial block number", async function() {
    initialBlockNumber = to.number(await web3.eth.getBlockNumber());
  });

  before("Get initial balance and nonce", async function() {
    const [balance, nonce] = await Promise.all([
      web3.eth.getBalance(accounts[0]),
      web3.eth.getTransactionCount(accounts[0])
    ]);

    initial.balance = balance;
    initial.nonce = to.number(nonce);
  });

  before("Make transaction that changes balance, nonce and code", async function() {
    const { transactionHash } = await web3.eth.sendTransaction({
      from: accounts[0],
      data: contract.binary,
      gas: 3141592
    });
    ({ contractAddress } = await web3.eth.getTransactionReceipt(transactionHash));
  });

  it("should return the initial nonce at the previous block number", async function() {
    const nonce = await web3.eth.getTransactionCount(accounts[0], initialBlockNumber);
    assert.strictEqual(nonce, initial.nonce);

    // Check that the nonce incremented with the block number, just to be sure.
    const newNonce = await web3.eth.getTransactionCount(accounts[0], initialBlockNumber + 1);
    assert.strictEqual(newNonce, initial.nonce + 1);
  });

  it("should return the initial balance at the previous block number", async function() {
    const balance = await web3.eth.getBalance(accounts[0], initialBlockNumber);
    assert.strictEqual(balance, initial.balance);

    // Check that the balance incremented with the block number, just to be sure.
    const newBalance = await web3.eth.getBalance(accounts[0], initialBlockNumber + 1);
    const initialBalanceInEther = parseFloat(web3.utils.fromWei(initial.balance, "ether"));
    const balanceInEther = parseFloat(web3.utils.fromWei(newBalance, "ether"));
    assert(balanceInEther < initialBalanceInEther);
  });

  it("should return the no code at the previous block number", async function() {
    const code = await web3.eth.getCode(contractAddress, initialBlockNumber);
    assert.strictEqual(code, "0x");

    // Check that the code incremented with the block number, just to be sure.
    const newCode = await web3.eth.getCode(contractAddress, initialBlockNumber + 1);
    assert.notStrictEqual(newCode, "0x");
    assert(newCode.length > 20); // Just because we don't know the actual code we're supposed to get back
  });

  it("should produce correct tx and receipt root when the block contains 1 (or more) tx's", async function() {
    const block = await web3.eth.getBlock(initialBlockNumber + 1, false);
    assert.strictEqual(block.transactions.length, 1, "should have one tx in the block.");
    assert.notStrictEqual(block.transactionsRoot, block.receiptsRoot, "Trie roots should not be equal.");
    assert.strictEqual(
      block.transactionsRoot,
      "0xce8a25092b27c67e802dff9e3ec66aacf6232da66e2796243aaccdc0deaaa1db",
      "Should produce correct transactionsRoot"
    );
    assert.strictEqual(
      block.receiptsRoot,
      "0xa63df9d6e2147dbffa164b173ead7c10d14d95c6e83dbb879ddc45ad7e8dfc89",
      "Should produce correct receiptsRoot"
    );
  });
});
