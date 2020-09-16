const assert = require("assert");
const bootstrap = require("../../helpers/contract/bootstrap");
const initializeTestProvider = require("../../helpers/web3/initializeTestProvider");

/**
 * NOTE: Naming in these tests is a bit confusing. Here, the "main chain"
 * is the main chain the tests interact with; and the "forked chain" is the
 * chain that _was forked_. This is in contrast to general naming, where the
 * main chain represents the main chain to be forked (like the Ethereum live
 * network) and the fork chain being "the fork".
 */

// Defining our own functions to send raw rpc calls because web3
// does a toLower on the address

async function getBalance(web3, id, address, blockNumber) {
  return new Promise(function(resolve, reject) {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, blockNumber],
        id
      },
      function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(web3.utils.hexToNumberString(result.result));
        }
      }
    );
  });
}

async function getCode(web3, id, address, blockNumber) {
  return new Promise(function(resolve, reject) {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: [address, blockNumber],
        id
      },
      function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result.result);
        }
      }
    );
  });
}

async function getStorageAt(web3, id, address, position, blockNumber) {
  return new Promise(function(resolve, reject) {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "eth_getStorageAt",
        params: [address, position, blockNumber],
        id
      },
      function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result.result);
        }
      }
    );
  });
}

describe("Forking methods are Case Insensitive", () => {
  let forkedContext;
  let forkedAccounts;
  let forkedBlockNumber;
  let mainContext;
  let mainAccounts;
  let instance;
  let id = 0;
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
    forkedAccounts = await forkedContext.web3.eth.getAccounts();
    forkedBlockNumber = await forkedContext.web3.eth.getBlockNumber();
  });

  before("Set up main provider and web3 instance", async function() {
    const { provider: forkedProvider } = forkedContext;
    mainContext = await initializeTestProvider({
      fork: forkedProvider,
      logger,
      seed: "forked provider"
    });
    mainAccounts = await mainContext.web3.eth.getAccounts();
  });

  before("Make transaction to a forked account", async function() {
    await mainContext.web3.eth.sendTransaction({
      from: mainAccounts[1],
      to: forkedAccounts[1],
      value: mainContext.web3.utils.toWei("1", "ether")
    });
  });

  before("Make a transaction to a forked contract that will modify storage", async function() {
    const { instance: forkedInstance, abi } = forkedContext;
    instance = new mainContext.web3.eth.Contract(abi, forkedInstance._address);
    await instance.methods.test().send({ from: mainAccounts[0] });
  });

  it("eth_getBalance", async function() {
    const mainWeb3 = mainContext.web3;

    const addressLower = forkedAccounts[1].toLowerCase();
    const balanceBeforeForkLower = await getBalance(mainWeb3, id++, addressLower, forkedBlockNumber);
    const balanceNowLower = await getBalance(mainWeb3, id++, addressLower, "latest");
    assert.strictEqual(balanceBeforeForkLower, mainWeb3.utils.toWei("100", "ether"));
    assert.strictEqual(balanceNowLower, mainWeb3.utils.toWei("101", "ether"));

    const addressUpper = forkedAccounts[1].toUpperCase().replace(/^0X/, "0x");
    const balanceBeforeForkUpper = await getBalance(mainWeb3, id++, addressUpper, forkedBlockNumber);
    const balanceNowUpper = await getBalance(mainWeb3, id++, addressUpper, "latest");
    assert.strictEqual(balanceBeforeForkUpper, mainWeb3.utils.toWei("100", "ether"));
    assert.strictEqual(balanceNowUpper, mainWeb3.utils.toWei("101", "ether"));

    // ensure nothing got changed in these calls
    const balanceNowLower2 = await getBalance(mainWeb3, id++, addressLower, "latest");
    assert.strictEqual(balanceNowLower2, balanceNowLower);
  });

  it("eth_getCode", async function() {
    const mainWeb3 = mainContext.web3;

    const addressLower = forkedContext.instance._address.toLowerCase();
    const codeBeforeDeployLower = await getCode(mainWeb3, id++, addressLower, "earliest");
    const codeBeforeForkLower = await getCode(mainWeb3, id++, addressLower, forkedBlockNumber);
    const codeNowLower = await getCode(mainWeb3, id++, addressLower, "latest");
    assert.strictEqual(codeBeforeDeployLower, "0x");
    assert.strictEqual(codeBeforeForkLower.length > 2, true);
    assert.strictEqual(codeNowLower.length > 2, true);
    assert.strictEqual(codeBeforeForkLower, codeNowLower);

    const addressUpper = forkedContext.instance._address.toUpperCase().replace(/^0X/, "0x");
    const codeBeforeDeployUpper = await getCode(mainWeb3, id++, addressUpper, "earliest");
    const codeBeforeForkUpper = await getCode(mainWeb3, id++, addressUpper, forkedBlockNumber);
    const codeNowUpper = await getCode(mainWeb3, id++, addressUpper, "latest");
    assert.strictEqual(codeBeforeDeployUpper, "0x");
    assert.strictEqual(codeBeforeForkUpper.length > 2, true);
    assert.strictEqual(codeNowUpper.length > 2, true);
    assert.strictEqual(codeBeforeForkUpper, codeNowUpper);

    // ensure nothing got changed in these calls
    const codeNowLower2 = await getCode(mainWeb3, id++, addressLower, "latest");
    assert.strictEqual(codeNowLower2, codeNowLower);
  });

  it("eth_getStorageAt", async function() {
    const mainWeb3 = mainContext.web3;

    const addressLower = forkedContext.instance._address.toLowerCase();
    const valueBeforeForkLower = await getStorageAt(mainWeb3, id++, addressLower, 0, forkedBlockNumber);
    const valueNowLower = await getStorageAt(mainWeb3, id++, addressLower, 0, "latest");
    assert.strictEqual(valueBeforeForkLower, "0x00");
    assert.strictEqual(valueNowLower, "0x01");

    const addressUpper = forkedContext.instance._address.toUpperCase().replace(/^0X/, "0x");
    const valueBeforeForkUpper = await getStorageAt(mainWeb3, id++, addressUpper, 0, forkedBlockNumber);
    const valueNowUpper = await getStorageAt(mainWeb3, id++, addressUpper, 0, "latest");
    assert.strictEqual(valueBeforeForkUpper, "0x00");
    assert.strictEqual(valueNowUpper, "0x01");

    // ensure nothing got changed in these calls
    const valueNowLower2 = await getStorageAt(mainWeb3, id++, addressLower, 0, "latest");
    assert.strictEqual(valueNowLower2, valueNowLower);
  });
});
