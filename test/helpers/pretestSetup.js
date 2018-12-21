const Ganache = require(process.env.TEST_BUILD
  ? "../build/ganache.core." + process.env.TEST_BUILD + ".js"
  : "../../index.js");
const Web3 = require("web3");

const { join } = require("path");
const { compileAndDeploy } = require("./compileDeploy");

const setUp = (mainContractName = "", subContractNames = [], options, contractPath = "../contracts/") => {
  const context = {};

  before("Setting up web3 and contract", async function() {
    this.timeout(10000);

    const provider = Ganache.provider(options);
    const web3 = new Web3(provider);

    const { abi, accounts, bytecode, contract, instance, sources } = await compileAndDeploy(
      mainContractName,
      subContractNames,
      join(__dirname, contractPath),
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

module.exports = {
  setUp
};
