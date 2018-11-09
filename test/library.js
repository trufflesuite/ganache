const Web3 = require("web3");
// const assert = require("assert");
const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const linker = require("solc/linker");
const assert = require("assert");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe.only("Libraries", function() {
  let libraryData;
  let libraryAbi;
  let Library;
  let libraryAddress;
  let contractAbi;
  let CallLibraryContract;
  let contractInstance;
  let contractBytecode;

  const provider = Ganache.provider();
  const web3 = new Web3(provider);
  let accounts = [];

  before("get accounts", async function() {
    accounts = await web3.eth.getAccounts();
  });

  before("compile sources - library & contract", async function() {
    this.timeout(10000);
    const librarySource = fs.readFileSync(path.join(__dirname, "Library.sol"), "utf8");
    const contractSource = fs.readFileSync(path.join(__dirname, "CallLibrary.sol"), "utf8");
    const input = {
      "Library.sol": librarySource,
      "CallLibrary.sol": contractSource
    };
    const result = solc.compile({ sources: input }, 1);

    libraryData = "0x" + result.contracts["Library.sol:Library"].bytecode;
    libraryAbi = JSON.parse(result.contracts["Library.sol:Library"].interface);

    contractBytecode = result.contracts["CallLibrary.sol:CallLibrary"].bytecode;
    contractAbi = JSON.parse(result.contracts["CallLibrary.sol:CallLibrary"].interface);
  });

  before("deploy library", async function() {
    Library = new web3.eth.Contract(libraryAbi);
    let promiEvent = Library.deploy({ data: libraryData }).send({
      from: accounts[0],
      gas: 3141592
    });

    promiEvent.on("receipt", function(receipt) {
      libraryAddress = receipt.contractAddress;
    });

    await promiEvent;
  });

  before("deploy contract", async function() {
    contractBytecode = linker.linkBytecode(contractBytecode, { "Library.sol:Library": libraryAddress });
    let contractData = "0x" + contractBytecode;

    CallLibraryContract = new web3.eth.Contract(contractAbi);
    let promiEvent = CallLibraryContract.deploy({ data: contractData }).send({
      from: accounts[0],
      gas: 3141592
    });

    contractInstance = await promiEvent;
  });

  after("cleanup", function() {
    web3.setProvider(null);
    provider.close(() => {});
  });

  it("should return true if the msg.sender is the externally owned account", async() => {
    const result = await contractInstance.methods.callExternalLibraryFunction().call();
    assert.strictEqual(true, result);
  });
});
