const solc = require("solc");
const { readFileSync } = require("fs");

/**
 * Compile the specified contract(s)
 * @param {String} mainContractName  Name of the main contract (without .sol extension)
 * @param {Array|String} contractFileNames List of imported contracts
 * @param {String} contractPath  Path to contracts directory
 * @returns {Object} context: abi, bytecode
 */
async function compile(mainContractName, contractFileNames = [], contractPath) {
  const selectedContracts = [mainContractName].concat(contractFileNames);

  const contractSources = selectedContracts.map((contractName) => {
    const _contractName = `${contractName.replace(/\.sol$/i, "")}.sol`;
    return { [_contractName]: readFileSync(`${contractPath}${_contractName}`, "utf8") };
  });

  const sources = Object.assign({}, ...contractSources);

  const { contracts } = solc.compile({ sources });

  const _mainContractName = mainContractName.replace(/\.sol$/i, "");
  const compiledMainContract = contracts[`${_mainContractName}.sol:${_mainContractName}`];
  const bytecode = `0x${compiledMainContract.bytecode}`;
  const abi = JSON.parse(compiledMainContract.interface);

  return {
    abi,
    bytecode
  };
}

/**
 * Deploy a compiled contract
 * @param {String} abi  contract ABI
 * @param {String} bytecode  contract bytecode
 * @param {Object} web3 Web3 interface
 * @returns {Object} context: abi, accounts, bytecode, contract, instance
 */
async function deploy(abi, bytecode, web3) {
  const contract = new web3.eth.Contract(abi);

  const accounts = await web3.eth.getAccounts();
  const { gasLimit } = await web3.eth.getBlock("latest");
  const instance = await contract.deploy({ data: bytecode }).send({ from: accounts[0], gas: gasLimit });

  return {
    abi,
    accounts,
    bytecode,
    contract,
    instance
  };
}

/**
 * Compile and deploy the specified contract(s)
 * @param {String} contractPath  Path to contracts directory
 * @param {String} mainContractName  Name of the main contract (without .sol extension)
 * @param {Array|String} contractFileNames List of imported contracts
 * @param {Object} web3 Web3 interface
 * @returns {Object} context: abi, accounts, bytecode, contract, instance, sources
 */
async function compileAndDeploy(mainContractName, contractFileNames = [], contractPath, web3) {
  const { abi, bytecode } = await compile(mainContractName, contractFileNames, contractPath);
  return deploy(abi, bytecode, web3);
}

module.exports = {
  compile,
  compileAndDeploy,
  deploy
};
