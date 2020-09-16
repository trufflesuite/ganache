const assert = require("assert");
const bootstrap = require("../../helpers/contract/bootstrap");
const initializeTestProvider = require("../../helpers/web3/initializeTestProvider");

/**
 * NOTE: Naming in these tests is a bit confusing. Here, the "main chain"
 * is the main chain the tests interact with; and the "forked chain" is the
 * chain that _was forked_. This is in contrast to general naming, where the
 * main chain represents the main chain to be forked (like the Ethereum live
 * network) and the fork chaing being "the fork".
 */

describe("Forking using a Provider", () => {
  let forkedContext;
  let mainContext;
  const logger = {
    log: function(msg) {}
  };

  before("Set up forked provider with web3 instance and deploy a contract", async function() {
    this.timeout(5000);

    const contractRef = {
      contractFiles: ["Example"],
      contractSubdirectory: "examples"
    };

    const ganacheProviderOptions = {
      logger,
      seed: "main provider"
    };

    forkedContext = await bootstrap(contractRef, ganacheProviderOptions);
  });

  before("Set up main provider and web3 instance", async function() {
    const { provider: forkedProvider } = forkedContext;
    mainContext = await initializeTestProvider({
      fork: forkedProvider,
      logger,
      seed: "forked provider"
    });
  });

  // NOTE: This is the only real test in this file. Since we have another forking test file filled
  // with good tests, this one simply ensures the forked feature still works by testing that we can
  // grab data from the forked chain when a provider instance is passed (instead of a URL). If this
  // one passes, it should follow that the rest of the forking features should work as normal.
  it("gets code correctly via the main chain (i.e., internally requests it from forked chain)", async() => {
    const { instance } = forkedContext;
    const { web3: mainWeb3 } = mainContext;

    const code = await mainWeb3.eth.getCode(instance._address);

    // Ensure that a contract is at the address
    assert.notStrictEqual(code, null);
    assert.notStrictEqual(code, "0x");
    assert.notStrictEqual(code, "0x0");
  });
});
