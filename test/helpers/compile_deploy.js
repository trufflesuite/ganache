const { readFileSync } = require("fs");
const { compile } = require("solc");

/**
 * Compile and deploy the selected contract(s)
 * @param {String} contractPath  Path to contracts directory
 * @param {String} mainContractName  Name of the main contract (without .sol extension)
 * @param {Array|String} contractFileNames List of imported contracts
 * @param {Object} web3 Web3 interface
 * @returns {Object} context
 */
async function compileAndDeploy(contractPath, mainContractName, contractFileNames = [], web3) {
  // Organize contract(s) for compilation
  const selectedContracts = contractFileNames.length === 0 ? [mainContractName] : contractFileNames;
  const contractSources = selectedContracts.map((contractName) => {
    return { [`${contractName}.sol`]: readFileSync(`${contractPath}${contractName}.sol`, "utf8") };
  });

  const sources = Object.assign({}, ...contractSources);

  const { contracts } = compile({ sources }, 1);
  const compiledMainContract = contracts[`${mainContractName}.sol:${mainContractName}`];
  const bytecode = `0x${compiledMainContract.bytecode}`;
  const abi = JSON.parse(compiledMainContract.interface);
  const contract = new web3.eth.Contract(abi);

  const accounts = await web3.eth.getAccounts();

  // Retrieve block gas limit
  const { gasLimit } = await web3.eth.getBlock("latest");
  const instance = await contract.deploy({ data: bytecode }).send({ from: accounts[0], gas: gasLimit });

  // TODO: ugly workaround - not sure why this is necessary.
  if (!instance._requestManager.provider) {
    instance._requestManager.setProvider(web3.eth._provider);
  }

  return {
    abi,
    accounts,
    bytecode,
    contract,
    instance,
    sources
  };
}

exports = module.exports = {
  compileAndDeploy
};
