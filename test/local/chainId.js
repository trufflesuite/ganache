const assert = require("assert");
const initializeTestProvider = require("../helpers/web3/initializeTestProvider");
const { compile } = require("../helpers/contract/compileAndDeploy");

describe("Chain Id option", function() {
  const contract = {};

  before("compile contract", async function() {
    this.timeout(10000);
    const contractSubdirectory = "chainId";
    const contractFilename = "ChainId";
    const subcontractFiles = [];
    const { abi, bytecode } = await compile(contractFilename, subcontractFiles, contractSubdirectory, "istanbul");
    contract.abi = abi;
    contract.bytecode = bytecode;
  });

  describe("Allow Unlimited Contract Size", function() {
    let context;

    before("Setup provider to allow unlimited contract size", async function() {
      const ganacheOptions = {
        _chainId: 1,
        _chainIdRpc: 1
      };

      context = await initializeTestProvider(ganacheOptions);
    });

    before("deploy contract", async function() {
      const chainIdContract = new context.web3.eth.Contract(contract.abi);
      contract.deployed = await chainIdContract
        .deploy({
          data: contract.bytecode
        })
        .send({
          from: context.accounts[0],
          gas: 3141592
        });
    });

    it("chainid opcode should match options", async function() {
      const chainId = await contract.deployed.methods.getChainId().call();
      assert.strictEqual(chainId, "1");
    });

    it("chain id rpc should match options", async function() {
      const chainId = await context.web3.eth.getChainId();
      assert.strictEqual(chainId, 1);
    });
  });
});
