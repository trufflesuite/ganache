const assert = require("assert");
const bootstrap = require("./helpers/contract/bootstrap");

describe("Block Tags", function() {
  let context;
  const contract = {};
  const initialState = {};

  before("Setting up web3 and contract", async function() {
    this.timeout(10000);

    const contractRef = {
      contractFiles: ["Example"],
      contractSubdirectory: "examples"
    };

    context = await bootstrap(contractRef);
  });

  before("Customize contract data", function() {
    const { abi, bytecode } = context;

    // Note: Certain properties of the following contract data are hardcoded to
    // maintain repeatable tests. If you significantly change the solidity code,
    // make sure to update the resulting contract data with the correct values.
    Object.assign(contract, {
      abi,
      binary: bytecode,
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
    });
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
    const { contractAddress } = await web3.eth.sendTransaction({
      from: accounts[0],
      data: contract.binary,
      gas: 3141592
    });

    Object.assign(initialState, { contractAddress });
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
});
