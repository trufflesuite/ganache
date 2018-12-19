const assert = require("assert");
const { setUp } = require("../helpers/pretest_setup");

describe("Undefined", () => {
  describe("Calls", async() => {
    const mainContract = "Call";
    const contractFilenames = ["Call"];
    const options = {
      vmErrorsOnRPCResponse: false
    };

    const services = setUp(mainContract, contractFilenames, options);

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

    it("should throw due to returned value of `0x` when eth_call fails (compiled contract call)", () => {
      const { instance } = services;
      // running this test with callback style because I couldn't get `assert.throws`
      // to work with async/await (in node 10.0.0 this is handled by `assert.rejects`)
      instance.methods.causeReturnValueOfUndefined().call((err) => {
        // web3 will try to parse this return value of `0x` to something, but there is no
        // way to properly represent the DATA type `0x` in JS.
        assert.strictEqual(err.message, "Couldn't decode bool from ABI: 0x");
      });
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
