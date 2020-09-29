const assert = require("assert");
const bootstrap = require("../../helpers/contract/bootstrap");
const initializeTestProvider = require("../../helpers/web3/initializeTestProvider");

describe("Forking eth_call", () => {
  let forkedContext;
  const logger = {
    log: function(msg) {}
  };

  before("Set up forked provider with web3 instance and deploy a contract", async function() {
    this.timeout(5000);

    const contractRef = {
      contractFiles: ["Snapshot"],
      contractSubdirectory: "forking"
    };

    const ganacheProviderOptions = {
      logger,
      seed: "main provider"
    };

    forkedContext = await bootstrap(contractRef, ganacheProviderOptions);
  });

  it("gets values at specified blocks on the original change", async function() {
    const {
      send,
      accounts: [from],
      abi,
      web3: originalWeb3,
      instance: { _address: contractAddress },
      provider: originalProvider
    } = forkedContext;

    const originalContract = new originalWeb3.eth.Contract(abi, contractAddress);

    const txParams = { from };

    await originalContract.methods.test().send(txParams);
    const initialValue = await originalContract.methods.value().call();
    await send("evm_mine", null);
    const { result: preForkBlockNumber } = await send("eth_blockNumber");

    // Fork the "original" chain _now_
    const { web3 } = await initializeTestProvider({
      fork: originalProvider,
      logger,
      seed: "forked provider"
    });

    const instance = new web3.eth.Contract(abi, contractAddress);

    // get the value as it was before we forked
    instance.defaultBlock = preForkBlockNumber;
    // there is a bug possibly unrelated to this PR that prevents this from
    // returning the wrong value (it crashes with a `pop of undefined` instead).
    const finalValue = await instance.methods.value().call();
    assert.strictEqual(finalValue, initialValue);
  });
});
