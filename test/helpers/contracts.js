const { readFileSync } = require("fs");
const { compile } = require("solc");
const { basename } = require("path");

async function compileAndDeploy(contractPath, contractName, web3) {
  const contractFilename = basename(contractPath);

  const source = readFileSync(contractPath, "utf8");

  const { contracts } = compile({ sources: { [contractFilename]: source } }, 1);

  const compiledContracts = contracts[`${contractFilename}:${contractName}`];
  const bytecode = "0x" + compiledContracts.bytecode;
  const abi = JSON.parse(compiledContracts.interface);

  const contract = new web3.eth.Contract(abi);

  const accounts = await web3.eth.getAccounts();
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
    source
  };
}

exports = module.exports = {
  compileAndDeploy
};
