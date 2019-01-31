const Ganache = require(process.env.TEST_BUILD
  ? "../../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../../index.js");
const Web3 = require("web3");
const { join } = require("path");
const { compileAndDeploy } = require("./compileAndDeploy");

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

    // Setup contract path
    const provider = Ganache.provider(options);
    const web3 = new Web3(provider);

    const { abi, accounts, bytecode, contract, instance, sources } = await compileAndDeploy(
      mainContractName,
      subContractNames,
      join(__dirname, "..", "..", "contracts", `${contractSubdirectory}/`),
      web3
    );

    Object.assign(context, {
      abi,
      accounts,
      bytecode,
      contract,
      instance,
      provider,
      sources,
      web3
    });
  });

  return context;
};

module.exports = bootstrap;
