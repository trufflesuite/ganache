const assert = require("assert");
const to = require("../../lib/utils/to");
const bootstrap = require("../helpers/contract/bootstrap");

const providerOptions = [{ vmErrorsOnRPCResponse: true }, { vmErrorsOnRPCResponse: false }];

// Run all test with options
providerOptions.forEach((ganacheProviderOptions) => {
  tests(ganacheProviderOptions);
});

function tests(ganacheProviderOptions) {
  describe("Runtime Errors with vmErrorsOnRPCResponse", function() {
    let context;

    before("Compile contract and setup provider", async function() {
      this.timeout(10000);
      const contractRef = {
        contractFiles: ["RuntimeError"],
        contractSubdirectory: "runtime"
      };

      context = await bootstrap(contractRef, ganacheProviderOptions);
      const _send = context.provider.send.bind(context.provider.send);
      let jsonRpcId = 1;
      // we want to ignore the callback `err` so we are creating our own promisified send here
      context.send = (method, ...params) =>
        new Promise((resolve) => {
          _send(
            {
              id: jsonRpcId++,
              jsonrpc: "2.0",
              method,
              params: [...params]
            },
            (err, response) => resolve({ err, response })
          );
        });
    });

    it("Should fail to estimate gas when the transaction is invalid", async() => {
      const { accounts, instance, send } = context;
      const txParams = {
        from: accounts[0],
        // this errors:
        to: instance.options.address
      };
      const result = await send("eth_estimateGas", txParams);
      assert.deepStrictEqual(result.response.error.code, -32000, "Gas estimation error code is not as expected");
      assert.deepStrictEqual(
        result.response.error.message,
        "VM Exception while processing transaction: revert",
        "Gas estimation error message is not as expected"
      );
    });

    it("should output the transaction hash even if a (out of gas) runtime error occurred", async function() {
      const { accounts, bytecode, provider, send } = context;

      const { response } = await send("eth_sendTransaction", {
        from: accounts[0],
        data: bytecode
      });

      if (provider.options.vmErrorsOnRPCResponse) {
        // null & undefined are equivalent for equality tests, but I'm being
        // pedantic here for readability's sake
        assert(response.error !== null);
        assert(response.error !== undefined);
      } else {
        assert(response.error === undefined);
      }

      // null & undefined are equivalent for equality tests, but I'm being
      // pedantic here for readability's sake
      assert(response.result !== null);
      assert(response.result !== undefined);

      assert.strictEqual(response.result.length, 66); // transaction hash
    });

    it("should output the transaction hash even if a runtime error occurs (revert)", async function() {
      const { accounts, instance, provider, send } = context;

      const { response } = await send("eth_sendTransaction", {
        from: accounts[0],
        to: instance.options.address,
        // calls error()
        data: "0xc79f8b62",
        gas: to.hex(3141592)
      });

      if (provider.options.vmErrorsOnRPCResponse) {
        // null & undefined are equivalent for equality tests, but I'm being
        // pedantic here for readability's sake
        assert(response.error !== null);
        assert(response.error !== undefined);

        assert(
          /revert/.test(response.error.message),
          `Expected error message (${response.error.message}) to contain 'revert'`
        );
      } else {
        assert(response.error === undefined);
      }

      // null & undefined are equivalent for equality tests, but I'm being
      // pedantic here for readability's sake
      assert(response.result !== null);
      assert(response.result !== undefined);

      assert.strictEqual(response.result.length, 66); // transaction hash
    });

    it("should have correct return value when calling a method that reverts without message", async function() {
      const { accounts, instance, provider, send } = context;

      const { response } = await send("eth_call", {
        from: accounts[0],
        to: instance.options.address,
        // calls error()
        data: "0xc79f8b62",
        gas: to.hex(3141592)
      });

      if (provider.options.vmErrorsOnRPCResponse) {
        // null & undefined are equivalent for equality tests, but I'm being
        // pedantic here for readability's sake
        assert(response.error !== null);
        assert(response.error !== undefined);
        assert(response.result === undefined || response.result === null);

        assert(
          /revert/.test(response.error.message),
          `Expected error message (${response.error.message}) to contain 'revert'`
        );
      } else {
        assert(response.error === undefined);
        assert(response.result === "0x");
      }
    });

    it("should have correct return value when calling a method that reverts without message", async function() {
      const { accounts, instance, provider, send } = context;

      const { response } = await send("eth_call", {
        from: accounts[0],
        to: instance.options.address,
        // calls error()
        data: "0xc79f8b62",
        gas: to.hex(3141592)
      });

      if (provider.options.vmErrorsOnRPCResponse) {
        // null & undefined are equivalent for equality tests, but I'm being
        // pedantic here for readability's sake
        assert(response.error !== null);
        assert(response.error !== undefined);
        assert(response.result === undefined || response.result === null);

        assert(
          /revert/.test(response.error.message),
          `Expected error message (${response.error.message}) to contain 'revert'`
        );
      } else {
        assert(response.error === undefined);
        assert(response.result === "0x");
      }
    });

    it("should have correct return value when calling a method that reverts with message", async function() {
      const { accounts, instance, provider, send } = context;

      const { response } = await send("eth_call", {
        from: accounts[0],
        to: instance.options.address,
        // calls error()
        data: "0xcd4aed30",
        gas: to.hex(3141592)
      });

      if (provider.options.vmErrorsOnRPCResponse) {
        // null & undefined are equivalent for equality tests, but I'm being
        // pedantic here for readability's sake
        assert(response.error !== null);
        assert(response.error !== undefined);
        assert(response.result === undefined || response.result === null);

        // RuntimeError.sol reverts with revert("Message")
        assert(
          /Message/.test(response.error.message),
          `Expected error message (${response.error.message}) to contain revert reason "Message"`
        );
        assert(
          /revert/.test(response.error.message),
          `Expected error message (${response.error.message}) to contain 'revert'`
        );
      } else {
        assert(response.error === undefined);
        assert(
          response.result ===
            "0x08c379a000000000000000000000000000000000000000000000000000000000000000" +
              "2000000000000000000000000000000000000000000000000000000000000000074d6573" +
              "7361676500000000000000000000000000000000000000000000000000"
        );
      }
    });

    if (ganacheProviderOptions.vmErrorsOnRPCResponse === true) {
      it("should output instruction index on runtime errors", async function() {
        const { accounts, instance, send } = context;

        const { err, response } = await send("eth_sendTransaction", {
          from: accounts[0],
          to: instance.options.address,
          // calls error()
          data: "0xc79f8b62",
          gas: to.hex(3141592)
        });

        if (err) {
          assert(err);
        }
        const txHash = response.result;

        assert(response.error);
        assert(response.error.data[txHash]);
        // magic number, will change if compiler changes.
        assert.strictEqual(to.number(response.error.data[txHash].program_counter), 136);
      });
    }

    after("shutdown", function(done) {
      context.provider.close(done);
    });
  });
}
