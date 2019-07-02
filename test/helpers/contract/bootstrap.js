const { compileAndDeploy } = require("./compileAndDeploy");
const initializeTestProvider = require("../web3/initializeTestProvider");

/**
 * @param {Object} contractRef Object containing contract files and subdirectory path
 * @param {Object} providerOptions Provider options
 * @param {Object} compilerOptions Compiler options
 * @returns {Object} abi, accounts, bytecode, contract, instance, provider, receipt, sources, web3
 */
const bootstrap = async(contractRef = {}, providerOptions = {}, hardfork) => {
  const { accounts, provider, send, web3 } = await initializeTestProvider(providerOptions);
  const { contractFiles, contractSubdirectory } = contractRef;
  const [mainContractName, ...subContractNames] = contractFiles;
  const testAssets = await compileAndDeploy(
    mainContractName,
    subContractNames,
    contractSubdirectory,
    web3,
    providerOptions,
    accounts,
    hardfork
  );

  return Object.assign({ provider, send, web3 }, testAssets);
};

module.exports = bootstrap;
