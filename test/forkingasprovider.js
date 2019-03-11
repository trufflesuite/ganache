const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../index.js");
const Web3 = require("web3");
const assert = require("assert");
const intializeTestProvider = require("./helpers/web3/initializeTestProvider");
const { compile } = require("./helpers/contract/compileAndDeploy");

const logger = {
  log: function(msg) {}
};

/**
 * NOTE: Naming in these tests is a bit confusing. Here, the "main chain"
 * is the main chain the tests interact with; and the "forked chain" is the
 * chain that _was forked_. This is in contrast to general naming, where the
 * main chain represents the main chain to be forked (like the Ethereum live
 * network) and the fork chaing being "the fork".
 */

describe("Forking using a Provider", function() {
  let contract;
  const forkedProvider = Ganache.provider({
    logger: logger,
    seed: "main provider"
  });
  const forkedWeb3 = new Web3(forkedProvider);
  let forkedAccounts;
  let contractAddress;

  before("set up test data", async function() {
    this.timeout(5000);
    const { bytecode } = await compile("Example", ["Example"], "examples");

    // Note: Certain properties of the following contract data are hardcoded to
    // maintain repeatable tests. If you significantly change the solidity code,
    // make sure to update the resulting contract data with the correct values.
    contract = {
      bytecode,
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
  });

  before("Gather forked accounts", async function() {
    forkedAccounts = await forkedWeb3.eth.getAccounts();
  });

  before("Deploy initial contracts", async function() {
    const receipt = await forkedWeb3.eth.sendTransaction({
      from: forkedAccounts[0],
      data: contract.bytecode,
      gas: 3141592
    });

    contractAddress = receipt.contractAddress;

    const code = await forkedWeb3.eth.getCode(contractAddress);
    // Ensure there's *something* there.
    assert.notStrictEqual(code, null);
    assert.notStrictEqual(code, "0x");
    assert.notStrictEqual(code, "0x0");
  });

  let mainContext;
  before("Set up main provider and web3 instance", async function() {
    mainContext = await intializeTestProvider({
      fork: forkedProvider,
      logger,
      seed: "forked provider"
    });
  });

  // NOTE: This is the only real test in this file. Since we have another forking test file filled
  // with good tests, this one simply ensures the forked feature still works by testing that we can
  // grab data from the forked chain when a provider instance is passed (instead of a URL). If this
  // one passes, it should follow that the rest of the forking features should work as normal.
  it("gets code correctly via the main chain (i.e., internally requests it from forked chain)", async function() {
    const { web3: mainWeb3 } = mainContext;
    const code = await mainWeb3.eth.getCode(contractAddress);

    // Ensure there's *something* there.
    assert.notStrictEqual(code, null);
    assert.notStrictEqual(code, "0x");
    assert.notStrictEqual(code, "0x0");
  });
});
