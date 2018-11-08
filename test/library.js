const Web3 = require("web3");
// const assert = require("assert");
const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const fs = require("fs");
const path = require("path");
const solc = require("solc");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe.only("Libraries", function() {
  let callLibraryContractData;
  let callLibraryContractAbi;
  let CallLibraryContract;
  let callLibraryInstance;
  let contractDeploymentReceipt;

  let libraryContractData;
  let libraryContractAbi;
  let LibraryContract;
  let libraryInstance;
  let libraryDeploymentReceipt;

  const provider = Ganache.provider();
  const web3 = new Web3(provider);
  let accounts = [];

  before("get accounts", async function() {
    accounts = await web3.eth.getAccounts();
  });

  before("compile source - library", async function() {
    this.timeout(10000);
    const source = fs.readFileSync(path.join(__dirname, "Library.sol"), "utf8");
    const result = solc.compile({ sources: { "Library.sol": source } }, 1);

    libraryContractData = "0x" + result.contracts["Library.sol:Library"].bytecode;
    libraryContractAbi = JSON.parse(result.contracts["Library.sol:Library"].interface);

    LibraryContract = new web3.eth.Contract(libraryContractAbi);
    let promiEvent = LibraryContract.deploy({ data: libraryContractData }).send({
      from: accounts[0],
      gas: 3141592
    });

    promiEvent.on("receipt", function(receipt) {
      libraryDeploymentReceipt = receipt;
    });

    libraryInstance = await promiEvent;
  });

  before("compile source - contract", async function() {
    this.timeout(10000);
    let source =
      "                      \n" +
      "pragma solidity ^0.4.24;            \n" +
      "contract CallLibrary {                \n" +
      "  Library libraryContract = Library(" +
      `${libraryDeploymentReceipt.transactionHash}` +
      ");   \n" +
      "                                    \n" +
      "  function callExternalLibraryFunction() public view returns (address) { \n" +
      "    address sender = libraryContract.callCheckMsgSender();      \n" +
      "    return sender;      \n" +
      "  }                                 \n" +
      "}";

    const result = solc.compile(source, 1);
    console.log(result);

    callLibraryContractData = "0x" + result.contracts[":CallLibrary"].bytecode;
    callLibraryContractAbi = JSON.parse(result.contracts[":CallLibrary"].interface);

    CallLibraryContract = new web3.eth.Contract(callLibraryContractAbi);
    let promiEvent = CallLibraryContract.deploy({ data: callLibraryContractData }).send({
      from: accounts[0],
      gas: 3141592
    });

    promiEvent
      .on("receipt", function(receipt) {
        contractDeploymentReceipt = receipt;
      })
      .on("error", console.error);

    callLibraryInstance = await promiEvent;
  });

  after("cleanup", function() {
    web3.setProvider(null);
    provider.close(() => {});
  });

  it("does stuff", function(done) {
    console.log(libraryInstance, callLibraryInstance);
    console.log(contractDeploymentReceipt);

    done();
  });
});
