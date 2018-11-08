const Web3 = require("web3");
const Ganache = require("../../index");
const path = require("path");
const compileAndDeploy = require("./contracts").compileAndDeploy;

const setup = (contractName = "", mnemonics = "") => {
  const context = {};

  before("Setting up web3 and contract", async function() {
    this.timeout(10000);

    const options = mnemonics === "" ? {} : { mnemonics };
    const provider = Ganache.provider(options);
    const web3 = new Web3(provider);
    const accounts = await web3.eth.getAccounts();
    const { instance } = await compileAndDeploy(
      path.join(__dirname, "../contracts/", `${contractName}.sol`),
      contractName,
      web3
    );

    context.accounts = accounts;
    context.instance = instance;
    context.provider = provider;
    context.options = options;
    context.web3 = web3;
  });

  return context;
};

module.exports = {
  setup
};
