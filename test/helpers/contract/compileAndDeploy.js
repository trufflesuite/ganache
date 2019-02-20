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
 * @param {Object} options Provider options
 * @param {Array} existingAccounts Existing accounts
 * @returns {Object} context: abi, accounts, bytecode, contract, instance, receipt
 */
async function deploy(abi, bytecode, web3, options = {}, existingAccounts = []) {
  let accounts, block, receipt;

  if (existingAccounts.length) {
    block = await web3.eth.getBlock("latest");
  } else {
    const initialAssets = [web3.eth.getAccounts(), web3.eth.getBlock("latest")];
    [accounts, block] = await Promise.all(initialAssets);
  }

  const gas = options.gas || block.gasLimit;
  const contract = new web3.eth.Contract(abi);
  const instance = await contract
    .deploy({ data: bytecode })
    .send({ from: accounts[0], gas })
    .on("receipt", (rcpt) => {
      receipt = rcpt;
    });

  return {
    abi,
    accounts,
    bytecode,
    contract,
    instance,
    receipt
  };
}

/**
 * Compile and deploy the specified contract(s)
 * @param {String} mainContractName  Name of the main contract (without .sol extension)
 * @param {Array|String} contractFileNames List of imported contracts
 * @param {String} contractPath  Path to contracts directory
 * @param {Object} web3 Web3 interface
 * @param {Object} options Provider options
 * @param {Array} accounts Predetermined accounts
 * @returns {Object} context: abi, accounts, bytecode, contract, instance, receipt, sources
 */
async function compileAndDeploy(
  mainContractName,
  contractFileNames = [],
  contractPath,
  web3,
  options = {},
  accounts = []
) {
  const { abi, bytecode, sources } = await compile(mainContractName, contractFileNames, contractPath);
  const context = await deploy(abi, bytecode, web3, options, accounts);
  return Object.assign(context, { sources });
}

module.exports = {
  compile,
  compileAndDeploy,
  deploy
};
