const { join } = require("path");
const { compileAndDeploy } = require("./compileAndDeploy");
const initializeTestProvider = require("../web3/initializeTestProvider");

/**
 * @param {string} mainContractName Main contract filename (withouth file extension)
 * @param {string|Array} subContractNames Array of supporting contract filenames (without file extension)
 * @param {Object} options Provider options
 * @param {string} contractSubdirectory relative subdirectory under contract (Ex test/contracts/${contractSubdirectory})
 * @returns {Object} abi, accounts, bytecode, contract, instance, provider, sources, web3
 */
const bootstrap = (mainContractName = "", subContractNames = [], options = {}, contractSubdirectory = "") => {
  const context = {};

  before("Setting up web3 and contract", async function() {
    this.timeout(10000);

    const { accounts, provider, web3 } = await initializeTestProvider(options);

    const testAssets = await compileAndDeploy(
      mainContractName,
      subContractNames,
      join(__dirname, "..", "..", "contracts", `${contractSubdirectory}/`),
      web3,
      accounts
    );

    Object.assign(context, testAssets, { provider, web3 });
  });

  return context;
};

module.exports = bootstrap;
