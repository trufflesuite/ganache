const assert = require("assert");
const initializeTestProvider = require("./helpers/web3/initializeTestProvider");
const randomInteger = require("./helpers/utils/generateRandomInteger");
const { compile, deploy } = require("./helpers/contract/compileAndDeploy");
const { join } = require("path");

const SEED_RANGE = 1000000;
const seed = randomInteger(SEED_RANGE);

describe.only("Unlimited Contract Size", function() {
  let contract = {};

  before("compile contract", async function() {
    const contractSubdirectory = "customContracts";
    const contractFilename = "LargeContract";
    const subcontractFiles = [];
    const contractPath = join(__dirname, "contracts", `${contractSubdirectory}/`);
    const { abi, bytecode } = await compile(contractFilename, subcontractFiles, contractPath);
    Object.assign(contract, {
      abi,
      bytecode
    });
  });

  describe("Disallow Unlimited Contract Size", function() {
    let context;

    before("Setup provider to disallow unlimited contract size", async function() {
      const ganacheOptions = {
        seed,
        allowUnlimitedContractSize: false,
        gasLimit: 20000000
      };
      context = await initializeTestProvider(ganacheOptions);
    });

    it("should fail deployment", async function() {
      this.timeout(10000);
      const { web3 } = context;
      const { abi, bytecode } = contract;
      const errorMessage = "succeeded deployment when it should have failed";
      try {
        await deploy(abi, bytecode, web3, { gas: 20000000 });
        assert.fail(errorMessage);
      } catch (error) {
        assert.notStrictEqual(error.message, errorMessage);
      }
    });
  });

  describe("Allow Unlimited Contract Size", function() {
    let context;

    before("Setup provider to allow unlimited contract size", async function() {
      const ganacheOptions = {
        seed,
        allowUnlimitedContractSize: true,
        gasLimit: 20000000
      };

      context = await initializeTestProvider(ganacheOptions);
    });

    it("should succeed deployment", async function() {
      const { web3 } = context;
      const { abi, bytecode } = contract;
      await deploy(abi, bytecode, web3, { gas: 20000000 });
    });
  });
});
