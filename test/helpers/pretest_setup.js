const Web3 = require("web3");
const Ganache = require("../../index");
const { join } = require("path");
const { compileAndDeploy } = require("./compile_deploy");

const preloadContracts = (mainContractName = "", subContractNames = [], contractPath = "../contracts/", mnemonics) => {
  const context = {};

  before("Setting up web3 and contract", async function() {
    this.timeout(10000);

    const options = typeof mnemonics === "string" ? {} : { mnemonics };
    const provider = Ganache.provider(options);
    const web3 = new Web3(provider);

    const { abi, accounts, bytecode, contract, instance, sources } = await compileAndDeploy(
      join(__dirname, contractPath),
      mainContractName,
      subContractNames,
      web3
    );

    context.abi = abi;
    context.accounts = accounts;
    context.bytecode = bytecode;
    context.contract = contract;
    context.instance = instance;
    context.provider = provider;
    context.options = options;
    context.sources = sources;
    context.web3 = web3;
  });

  return context;
};

const preloadWeb3 = (mnemonics) => {
  const context = {};

  before("Setting up web3", async function() {
    this.timeout(10000);

    const options = typeof mnemonics === "string" ? {} : { mnemonics };
    const provider = Ganache.provider(options);
    const web3 = new Web3(provider);

    context.provider = provider;
    context.options = options;
    context.web3 = web3;
  });

  return context;
};

module.exports = {
  preloadContracts,
  preloadWeb3
};
