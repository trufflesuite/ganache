const assert = require("assert");
const bootstrap = require("../../helpers/contract/bootstrap");
const generateSend = require("../../helpers/utils/rpc");
const initializeTestProvider = require("../../helpers/web3/initializeTestProvider");
const Common = require("ethereumjs-common").default;

/**
 * NOTE: Naming in these tests is a bit confusing. Here, the "main chain"
 * is the main chain the tests interact with; and the "forked chain" is the
 * chain that _was forked_. This is in contrast to general naming, where the
 * main chain represents the main chain to be forked (like the Ethereum live
 * network) and the fork chaing being "the fork".
 */

describe("Forking Debugging", () => {
  let forkedContext;
  let mainContext;
  let mainAccounts;
  let common;
  const logger = {
    log: function(msg) {}
  };

  before("Set up forked provider with web3 instance and deploy a contract", async function() {
    this.timeout(5000);

    const contractRef = {
      contractFiles: ["Debug"],
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

    common = Common.forCustomChain("mainnet", {
      name: "ganache"
    });
    mainAccounts = await mainContext.web3.eth.getAccounts();
  });

  it("successfully manages storage slot deletion", async() => {
    const { instance: forkedInstance, abi } = forkedContext;
    const { web3: mainWeb3 } = mainContext;
    let value;

    const instance = new mainWeb3.eth.Contract(abi, forkedInstance._address);

    value = await instance.methods.value().call();
    assert.strictEqual(value, "1");

    const tx = await instance.methods.test().send({
      from: mainAccounts[0]
    });
    value = await instance.methods.value().call();
    assert.strictEqual(value, "2");

    const send = generateSend(mainWeb3.currentProvider);

    const result = await send("debug_traceTransaction", tx.transactionHash, {});

    const txStructLogs = result.result.structLogs;
    const txMemory = txStructLogs[txStructLogs.length - 1].memory;
    const txReturnValue = parseInt(txMemory[txMemory.length - 1], 16);
    assert.strictEqual(txReturnValue, 2);
  });

  it("successfully manages storage slot creation gas consumption", async() => {
    const { bytecode } = forkedContext;
    const { web3: mainWeb3 } = mainContext;

    const deployedContract = await mainWeb3.eth.sendTransaction({
      from: mainAccounts[0],
      data: bytecode,
      gas: 3141592
    });

    const send = generateSend(mainWeb3.currentProvider);

    const result = await send("debug_traceTransaction", deployedContract.transactionHash, {});

    for (let i = 0; i < result.result.structLogs.length; i++) {
      if (result.result.structLogs[i].op === "SSTORE") {
        // ensure that every SSTORE in contract creation triggers slot creation
        const gasCost = common.param("gasPrices", "sstoreInitGasEIP2200", "istanbul");
        assert.strictEqual(result.result.structLogs[i].gasCost, gasCost);
      }
    }
  });
});
