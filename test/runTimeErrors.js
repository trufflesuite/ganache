const assert = require("assert");
const to = require("../lib/utils/to");
const bootstrap = require("./helpers/contract/bootstrap");

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
    });

    it("should output the transaction hash even if a (out of gas) runtime error occurred", async function() {
      const { accounts, bytecode, provider } = context;

      await new Promise((resolve) => {
        provider.send(
          {
            jsonrpc: "2.0",
            method: "eth_sendTransaction",
            params: [
              {
                from: accounts[0],
                data: bytecode
              }
            ],
            id: 1
          },
          function(_, response) {
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
            resolve();
          }
        );
      });
    });

    it("should output the transaction hash even if a runtime error occurs (revert)", async function() {
      const { accounts, instance, provider } = context;

      await new Promise((resolve) => {
        provider.send(
          {
            jsonrpc: "2.0",
            id: new Date().getTime(),
            method: "eth_sendTransaction",
            params: [
              {
                from: accounts[0],
                to: instance.options.address,
                // calls error()
                data: "0xc79f8b62",
                gas: to.hex(3141592)
              }
            ]
          },
          function(_, response) {
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
            resolve();
          }
        );
      });
    });

    it("should have correct return value when calling a method that reverts without message", async function() {
      const { accounts, instance, provider } = context;

      await new Promise((resolve) => {
        provider.send(
          {
            jsonrpc: "2.0",
            id: new Date().getTime(),
            method: "eth_call",
            params: [
              {
                from: accounts[0],
                to: instance.options.address,
                // calls error()
                data: "0xc79f8b62",
                gas: to.hex(3141592)
              }
            ]
          },
          function(_, response) {
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

            resolve();
          }
        );
      });
    });

    it("should have correct return value when calling a method that reverts without message", async function() {
      const { accounts, instance, provider } = context;

      await new Promise((resolve) => {
        provider.send(
          {
            jsonrpc: "2.0",
            id: new Date().getTime(),
            method: "eth_call",
            params: [
              {
                from: accounts[0],
                to: instance.options.address,
                // calls error()
                data: "0xc79f8b62",
                gas: to.hex(3141592)
              }
            ]
          },
          function(_, response) {
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

            resolve();
          }
        );
      });
    });

    it("should have correct return value when calling a method that reverts with message", async function() {
      const { accounts, instance, provider } = context;

      await new Promise((resolve) => {
        provider.send(
          {
            jsonrpc: "2.0",
            id: new Date().getTime(),
            method: "eth_call",
            params: [
              {
                from: accounts[0],
                to: instance.options.address,
                // calls error()
                data: "0xcd4aed30",
                gas: to.hex(3141592)
              }
            ]
          },
          function(_, response) {
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
            resolve();
          }
        );
      });
    });

    if (ganacheProviderOptions.vmErrorsOnRPCResponse === true) {
      it("should output instruction index on runtime errors", async function() {
        const { accounts, instance, provider } = context;

        await new Promise((resolve) => {
          provider.send(
            {
              jsonrpc: "2.0",
              id: new Date().getTime(),
              method: "eth_sendTransaction",
              params: [
                {
                  from: accounts[0],
                  to: instance.options.address,
                  // calls error()
                  data: "0xc79f8b62",
                  gas: to.hex(3141592)
                }
              ]
            },
            function(err, response) {
              if (err) {
                assert(err);
              }
              let txHash = response.result;

              assert(response.error);
              assert(response.error.data[txHash]);
              // magic number, will change if compiler changes.
              assert.strictEqual(to.number(response.error.data[txHash].program_counter), 91);
              resolve();
            }
          );
        });
      });
    }

    after("shutdown", function(done) {
      const { provider } = context;
      provider.close(done);
    });
  });
}
