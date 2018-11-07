const fs = require("fs");
const solc = require("solc");
const path = require("path");

async function compileAndDeploy(contractPath, contractName, web3) {
  let contractFilename = path.basename(contractPath);

  let source = fs.readFileSync(contractPath, "utf8");

  let result = solc.compile({ sources: { [contractFilename]: source } }, 1);

  let bytecode = "0x" + result.contracts[`${contractFilename}:${contractName}`].bytecode;
  let abi = JSON.parse(result.contracts[`${contractFilename}:${contractName}`].interface);

  let contract = new web3.eth.Contract(abi);

  let accounts = await web3.eth.getAccounts();
  let block = await web3.eth.getBlock("latest");
  let gasLimit = block.gasLimit;

  let instance = await contract.deploy({ data: bytecode }).send({ from: accounts[0], gas: gasLimit });

  // TODO: ugly workaround - not sure why this is necessary.
  if (!instance._requestManager.provider) {
    instance._requestManager.setProvider(web3.eth._provider);
  }

  return {
    source,
    bytecode,
    abi,
    contract,
    instance
  };
}

exports = module.exports = {
  compileAndDeploy
};
