const Web3 = require("web3");
const Ganache = require("../../index");
const path = require("path");
const { compileAndDeploy } = require("./compile_deploy");

const setup = (mainContractName = "", subContractNames = [], mnemonics = "") => {
  const context = {};

  before("Setting up web3 and contract", async function() {
    this.timeout(10000);

    const options = mnemonics === "" ? {} : { mnemonics };
    const provider = Ganache.provider(options);
    const web3 = new Web3(provider);
    const { abi, accounts, bytecode, contract, instance, sources } = await compileAndDeploy(
      path.join(__dirname, "../contracts/"),
      mainContractName,
      web3,
      subContractNames
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

module.exports = {
  setup
};
