const assert = require("assert");
const bootstrap = require("../helpers/contract/bootstrap");

describe("Undefined", () => {
  describe("Calls", () => {
    let context;

    before("Setting up web3 and contract", async function() {
      this.timeout(10000);

      const contractRef = {
        contractFiles: ["Call"],
        contractSubdirectory: "call"
      };

      const ganacheProviderOptions = {
        vmErrorsOnRPCResponse: false
      };

      context = await bootstrap(contractRef, ganacheProviderOptions);
    });

    it("should return `0x` when eth_call fails (web3.eth call)", async() => {
      const { instance, web3 } = context;

      // test raw JSON RPC value:
      const result = await web3.eth.call({
        to: instance._address,
        data: instance.methods.causeReturnValueOfUndefined()._method.signature
      });
      assert.strictEqual(result, "0x");
    });

    it("should throw due to returned value of `0x` when eth_call fails (compiled contract call)", async() => {
      const { instance } = context;
      await assert.rejects(
        () => instance.methods.causeReturnValueOfUndefined().call(),
        /Couldn't decode bool from ABI: 0x/,
        "should not be able to decode bool from ABI"
      );
    });

    it("should return a value when contract and method exists at block (web3.eth.call)", async() => {
      const { instance, web3 } = context;

      const params = {
        to: instance._address,
        data: instance.methods.theAnswerToLifeTheUniverseAndEverything()._method.signature
      };
      // test raw JSON RPC value:
      const result = await web3.eth.call(params, "latest");
      assert.strictEqual(
        result,
        "0x000000000000000000000000000000000000000000000000000000000000002a",
        "it should return 42 (as hex)"
      );
    });

    it("should return a value when contract and method exists at block (compiled contract call)", async() => {
      const { instance } = context;
      const result = await instance.methods.theAnswerToLifeTheUniverseAndEverything().call();
      assert.strictEqual(result, "42");
    });

    it("should return 0x when contract doesn't exist at block", async() => {
      const { instance, web3 } = context;

      const params = {
        to: instance._address,
        data: instance.methods.theAnswerToLifeTheUniverseAndEverything()._method.signature
      };
      const result = await web3.eth.call(params, "earliest");

      assert.strictEqual(result, "0x");
    });

    it("should return 0x when method doesn't exist at block", async() => {
      const { instance, web3 } = context;
      const params = {
        to: instance._address,
        data: "0x01234567"
      };
      const result = await web3.eth.call(params, "latest");

      assert.strictEqual(result, "0x");
    });
  });
});
