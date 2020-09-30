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

async function takeSnapshot(web3) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_snapshot",
        id: new Date().getTime()
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result.result);
      }
    );
  });
}

async function revertToSnapShot(web3, stateId) {
  await new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_revert",
        params: [stateId],
        id: new Date().getTime()
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );
  });
}

describe("Forking Snapshots", () => {
  let forkedContext;
  let mainContext;
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

  before("Set up main provider and web3 instance", async function() {
    const { provider: forkedProvider } = forkedContext;
    mainContext = await initializeTestProvider({
      fork: forkedProvider,
      logger,
      seed: "forked provider"
    });
  });

  it("successfully handles snapshot/revert scenarios", async() => {
    const { instance: forkedInstance, abi } = forkedContext;
    const { web3: mainWeb3 } = mainContext;

    const accounts = await mainWeb3.eth.getAccounts();
    const instance = new mainWeb3.eth.Contract(abi, forkedInstance._address);
    const txParams = {
      from: accounts[0]
    };

    let value;

    value = await instance.methods.value().call();
    assert.strictEqual(value, "0");

    await instance.methods.test().send(txParams);

    value = await instance.methods.value().call();
    assert.strictEqual(value, "1");

    const beforeSnapshotNonce = await mainWeb3.eth.getTransactionCount(accounts[0]);
    const snapshotId = await takeSnapshot(mainWeb3);

    await instance.methods.test().send(txParams);

    value = await instance.methods.value().call();
    assert.strictEqual(value, "2");

    const beforeRevertNonce = await mainWeb3.eth.getTransactionCount(accounts[0]);
    assert.strictEqual(beforeRevertNonce, beforeSnapshotNonce + 1);

    await revertToSnapShot(mainWeb3, snapshotId);

    const afterRevertNonce = await mainWeb3.eth.getTransactionCount(accounts[0]);
    assert.strictEqual(afterRevertNonce, beforeSnapshotNonce);

    value = await instance.methods.value().call();
    assert.strictEqual(value, "1");

    await instance.methods.test().send(txParams);

    value = await instance.methods.value().call();
    assert.strictEqual(value, "2");
  }).timeout(5000);
});
