const assert = require("assert");
const bootstrap = require("./helpers/contract/bootstrap");

describe("Constantinople Hardfork", function() {
  const mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

  describe("Disallow Constantinople features", function() {
    let context;

    before("Setting up web3 and contract", async function() {
      this.timeout(10000);

      const contractRef = {
        contractFiles: ["ConstantinopleContract"],
        contractSubdirectory: "constantinople"
      };

      const ganacheProviderOptions = {
        mnemonic,
        gasLimit: 20000000,
        hardfork: "byzantium"
      };

      context = await bootstrap(contractRef, ganacheProviderOptions);
    });

    it("should fail execution", async function() {
      const { instance } = context;

      await assert.rejects(
        instance.methods.test(2).call(),
        /VM Exception while processing transaction: invalid opcode/,
        "Call did not fail execution like it was supposed to"
      );
    });
  });

  describe("Allow Constantinople features", function() {
    let context;

    before("Setting up web3 and contract", async function() {
      this.timeout(10000);

      const contractRef = {
        contractFiles: ["ConstantinopleContract"],
        contractSubdirectory: "constantinople"
      };

      const ganacheProviderOptions = {
        gasLimit: 20000000,
        hardfork: "constantinople",
        mnemonic
      };

      context = await bootstrap(contractRef, ganacheProviderOptions);
    });

    it("should succeed execution", async function() {
      const { instance } = context;

      const result = await instance.methods.test(2).call();
      assert(result, "successful execution");
    });
  });
});
