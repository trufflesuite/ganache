const solc = require("solc");
const { readFileSync } = require("fs");

/**
 * Compile the specified contract(s)
 * @param {String} mainContractName  Name of the main contract (without .sol extension)
 * @param {Array|String} contractFileNames List of imported contracts
 * @param {String} contractPath  Path to contracts directory
 * @returns {Object} context: abi, bytecode, sources
 */
async function compile(mainContractName, contractFileNames = [], contractPath) {
  const selectedContracts = [mainContractName].concat(contractFileNames);

  const contractSources = selectedContracts.map((contractName) => {
    const _contractName = `${contractName.replace(/\.sol$/i, "")}.sol`;
    return { [_contractName]: readFileSync(`${contractPath}${_contractName}`, "utf8") };
  });

  const sources = Object.assign({}, ...contractSources);

  // Second parameter configures solc to optimize compiled code
  const { contracts } = solc.compile({ sources }, 1);

  const _mainContractName = mainContractName.replace(/\.sol$/i, "");
  const compiledMainContract = contracts[`${_mainContractName}.sol:${_mainContractName}`];
  const bytecode = `0x${compiledMainContract.bytecode}`;
  const abi = JSON.parse(compiledMainContract.interface);

  return {
    abi,
    bytecode,
    sources
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
  const testAssets = [web3.eth.getAccounts(), web3.eth.getBlock("latest")];
  const [accounts, { gasLimit }] = await Promise.all(testAssets);
  const contract = new web3.eth.Contract(abi);
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
  const { abi, bytecode, sources } = await compile(mainContractName, contractFileNames, contractPath);
  const context = await deploy(abi, bytecode, web3);
  Object.assign(context, { sources });
  return context;
}

module.exports = {
  compile,
  compileAndDeploy,
  deploy
};
