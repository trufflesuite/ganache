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

describe("Forking Deletion", () => {
  let forkedContext;
  let mainContext;
  const logger = {
    log: function(msg) {}
  };

  before("Set up forked provider with web3 instance and deploy a contract", async function() {
    this.timeout(5000);

    const contractRef = {
      contractFiles: ["StorageDelete"],
      contractSubdirectory: "forking"
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

  it("successfully manages storage slot deletion", async() => {
    const { instance: forkedInstance, abi } = forkedContext;
    const { web3: mainWeb3 } = mainContext;

    const instance = new mainWeb3.eth.Contract(abi, forkedInstance._address);

    assert.ok(await instance.methods.test().call());
    assert.ok(await instance.methods.test().call());
  }).timeout(5000);
});
