const solc = require("solc");
const { join } = require("path");
const { readFileSync } = require("fs");

/**
 * Compile the specified contract(s)
 * @param {String} mainContractName  Name of the main contract (without .sol extension)
 * @param {Array|String} contractFileNames List of imported contracts
 * @param {String} contractPath  Path to contracts directory
 * @returns {Object} context: abi, bytecode, sources
 */
function compile(mainContractName, contractFileNames = [], contractSubdirectory, hardfork = "petersburg") {
  const contractPath = join(__dirname, "..", "..", "contracts", `${contractSubdirectory}/`);
  const selectedContracts = [mainContractName].concat(contractFileNames);

  const contractSources = selectedContracts.map((contractName) => {
    const _contractName = `${contractName.replace(/\.sol$/i, "")}.sol`;
    return { [_contractName]: { content: readFileSync(join(contractPath, _contractName), "utf8") } };
  });

  const input = {
    language: "Solidity",
    sources: Object.assign({}, ...contractSources),
    settings: {
      outputSelection: {
        "*": {
          "*": ["*"]
        }
      }
    }
  };
  input.settings.evmVersion = hardfork === "muirGlacier" ? "istanbul" : hardfork;

  const result = JSON.parse(solc.compile(JSON.stringify(input)));

  if (result.errors && result.errors.some((error) => error.severity === "error")) {
    const errorMessages = result.errors.map((error) => error.formattedMessage);
    throw new Error(`Could not compile test contracts:\n${errorMessages.join("")}`);
  }

  const _mainContractName = mainContractName.endsWith(".sol")
    ? mainContractName.replace(/\.sol$/i, "")
    : mainContractName;
  const compiledMainContract = result.contracts[`${_mainContractName}.sol`][`${_mainContractName}`];
  const bytecode = `0x${compiledMainContract.evm.bytecode.object}`;
  const abi = compiledMainContract.abi;

  return {
    abi,
    bytecode,
    input,
    result
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
    accounts = existingAccounts;
  } else {
    const initialAssets = [web3.eth.getAccounts(), web3.eth.getBlock("latest")];
    [accounts, block] = await Promise.all(initialAssets);
  }

  const gas = options.gas || block.gasLimit;
  const contract = new web3.eth.Contract(abi);
  const instance = await contract
    .deploy({ data: bytecode, arguments: options.constructorArguments })
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
  web3Options = {},
  accounts = [],
  hardfork
) {
  const { abi, bytecode, options, result } = compile(mainContractName, contractFileNames, contractPath, hardfork);
  const context = await deploy(abi, bytecode, web3, web3Options, accounts);
  return Object.assign(context, options, result);
}

module.exports = {
  compile,
  compileAndDeploy,
  deploy
};
