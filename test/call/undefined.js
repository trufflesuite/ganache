const assert = require("assert");
const { setUp } = require("../helpers/pretestSetup");

describe("Undefined", () => {
  describe("Calls", () => {
    const mainContract = "Call";
    const contractFilenames = [];
    const contractPath = "../contracts/call/";
    const options = {
      vmErrorsOnRPCResponse: false
    };

    const services = setUp(mainContract, contractFilenames, options, contractPath);

    it("should return `0x` when eth_call fails (web3.eth call)", async() => {
      const { instance, web3 } = services;

      const signature = instance.methods.causeReturnValueOfUndefined()._method.signature;

      // test raw JSON RPC value:
      const result = await web3.eth.call({
        to: instance._address,
        data: signature
      });
      assert.strictEqual(result, "0x");
    });

    it("should throw due to returned value of `0x` when eth_call fails (compiled contract call)", async() => {
      const { instance } = services;
      try {
        await instance.methods.causeReturnValueOfUndefined().call();
      } catch (error) {
        assert.strictEqual(error.message, "Couldn't decode bool from ABI: 0x");
      }
    });

    it("should return a value when contract and method exists at block (web3.eth.call)", async() => {
      const { instance, web3 } = services;

      const signature = instance.methods.theAnswerToLifeTheUniverseAndEverything()._method.signature;
      const params = {
        to: instance._address,
        data: signature
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
      const { instance } = services;
      const result = await instance.methods.theAnswerToLifeTheUniverseAndEverything().call();
      assert.strictEqual(result, "42");
    });

    it("should return 0x when contract doesn't exist at block", async() => {
      const { instance, web3 } = services;

      const signature = instance.methods.theAnswerToLifeTheUniverseAndEverything()._method.signature;
      const params = {
        to: instance._address,
        data: signature
      };
      const result = await web3.eth.call(params, "earliest");

      assert.strictEqual(result, "0x");
    });

    it("should return 0x when method doesn't exist at block", async() => {
      const { instance, web3 } = services;
      const params = {
        to: instance._address,
        data: "0x01234567"
      };
      const result = await web3.eth.call(params, "latest");

      assert.strictEqual(result, "0x");
    });
  });
});
