const assert = require("assert");
const initializeTestProvider = require("./helpers/web3/initializeTestProvider");
const randomInteger = require("./helpers/utils/generateRandomInteger");
const { compile, deploy } = require("./helpers/contract/compileAndDeploy");

const SEED_RANGE = 1000000;
const seed = randomInteger(SEED_RANGE);

describe("Unlimited Contract Size", function() {
  let contract = {};

  before("compile contract", async function() {
    this.timeout(10000);
    const contractSubdirectory = "customContracts";
    const contractFilename = "LargeContract";
    const subcontractFiles = [];
    const { abi, bytecode } = await compile(contractFilename, subcontractFiles, contractSubdirectory);
    contract.abi = abi;
    contract.bytecode = bytecode;
  });

  describe("Disallow Unlimited Contract Size", function() {
    let context;

    before("Setup provider to disallow unlimited contract size", async function() {
      const ganacheOptions = {
        seed,
        allowUnlimitedContractSize: false,
        gasLimit: 2e7
      };
      context = await initializeTestProvider(ganacheOptions);
    });

    it("should fail deployment", async function() {
      this.timeout(10000);
      const { web3 } = context;
      const { abi, bytecode } = contract;
      await assert.rejects(
        deploy(abi, bytecode, web3, { gas: 2e7 }),
        /VM Exception while processing transaction: out of gas/,
        "should not be able to deploy a very large contract"
      );
    });
  });

  describe("Allow Unlimited Contract Size", function() {
    let context;

    before("Setup provider to allow unlimited contract size", async function() {
      const ganacheOptions = {
        seed,
        allowUnlimitedContractSize: true,
        gasLimit: 2e7
      };

      context = await initializeTestProvider(ganacheOptions);
    });

    it("should succeed deployment", async function() {
      const { web3 } = context;
      const { abi, bytecode } = contract;
      await assert.doesNotReject(
        deploy(abi, bytecode, web3, { gas: 2e7 }),
        "should be able to deploy a very large contract"
      );
    });
  });
});
