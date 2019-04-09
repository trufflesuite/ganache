const { compileAndDeploy } = require("./compileAndDeploy");
const initializeTestProvider = require("../web3/initializeTestProvider");

/**
 * @param {Object} contractRef Object containing contract files and subdirectory path
 * @param {Object} options Provider options
 * @returns {Object} abi, accounts, bytecode, contract, instance, provider, receipt, sources, web3
 */
const bootstrap = async(contractRef = {}, options = {}) => {
  const { accounts, provider, send, web3 } = await initializeTestProvider(options);

  const { contractFiles, contractSubdirectory } = contractRef;
  const [mainContractName, ...subContractNames] = contractFiles;
  const testAssets = await compileAndDeploy(mainContractName, subContractNames, contractSubdirectory, web3, accounts);

  return Object.assign(testAssets, { provider, send, web3 });
};

module.exports = bootstrap;
