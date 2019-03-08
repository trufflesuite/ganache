const assert = require("assert");
const { hex, number } = require("../lib/utils/to");
const bootstrap = require("./helpers/contract/bootstrap");

describe("Runtime Errors with vmErrorsOnRPCResponse = true:", function() {
  let context;

  before("compile source", async function() {
    this.timeout(10000);
    const contractRef = {
      contractFiles: ["RuntimeError"],
      contractSubdirectory: "runtime"
    };

    const ganacheProviderOptions = {
      vmErrorsOnRPCResponse: true
    };

    context = await bootstrap(contractRef, ganacheProviderOptions);
  });

  it("should output the transaction hash even if an runtime error occurs (out of gas)", function(done) {
    const { accounts, bytecode, provider, web3 } = context;

    // we can't use `web3.eth.sendTransaction` because it will obfuscate the result
    web3.currentProvider.send(
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
      function(_, result) {
        if (provider.options.vmErrorsOnRPCResponse) {
          // null & undefined are equivalent for equality tests, but I'm being
          // pedantic here for readability's sake
          assert(result.error !== null);
          assert(result.error !== undefined);
        } else {
          assert(result.error === undefined);
        }

        // null & undefined are equivalent for equality tests, but I'm being
        // pedantic here for readability's sake
        assert(result.result !== null);
        assert(result.result !== undefined);

        assert.strictEqual(result.result.length, 66); // transaction hash
        done();
      }
    );
  });

  it("should output the transaction hash even if a runtime error occurs (revert)", function(done) {
    const { accounts, instance, provider } = context;

    // we can't use `web3.eth.sendTransaction` because it will obfuscate the result
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
            gas: hex(3141592)
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

        done();
      }
    );
  });

  it("should have correct return value when calling a method that reverts without message", function(done) {
    const { accounts, instance, provider } = context;

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
            gas: hex(3141592)
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

        done();
      }
    );
  });

  it("should have correct return value when calling a method that reverts without message", function(done) {
    const { accounts, instance, provider } = context;

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
            gas: hex(3141592)
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

        done();
      }
    );
  });

  it("should have correct return value when calling a method that reverts with message", function(done) {
    const { accounts, instance, provider } = context;

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
            gas: hex(3141592)
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
        done();
      }
    );
  });

  it("should output instruction index on runtime errors", function(done) {
    const { accounts, instance, provider } = context;

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
            gas: hex(3141592)
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
        assert.strictEqual(number(response.error.data[txHash].program_counter), 91);
        done();
      }
    );
  });

  after("shutdown", function(done) {
    const { provider } = context;

    provider.close(done);
  });
});

describe("Runtime Errors with vmErrorsOnRPCResponse = false:", function() {
  let context;

  before("compile source", async function() {
    this.timeout(10000);
    const contractRef = {
      contractFiles: ["RuntimeError"],
      contractSubdirectory: "runtime"
    };

    const ganacheProviderOptions = {
      vmErrorsOnRPCResponse: true
    };

    context = await bootstrap(contractRef, ganacheProviderOptions);
  });

  it("should output the transaction hash even if an runtime error occurs (out of gas)", function(done) {
    const { accounts, bytecode, provider, web3 } = context;

    // we can't use `web3.eth.sendTransaction` because it will obfuscate the result
    web3.currentProvider.send(
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
      function(_, result) {
        if (provider.options.vmErrorsOnRPCResponse) {
          // null & undefined are equivalent for equality tests, but I'm being
          // pedantic here for readability's sake
          assert(result.error !== null);
          assert(result.error !== undefined);
        } else {
          assert(result.error === undefined);
        }

        // null & undefined are equivalent for equality tests, but I'm being
        // pedantic here for readability's sake
        assert(result.result !== null);
        assert(result.result !== undefined);

        assert.strictEqual(result.result.length, 66); // transaction hash
        done();
      }
    );
  });

  it("should output the transaction hash even if a runtime error occurs (revert)", function(done) {
    const { accounts, instance, provider } = context;

    // we can't use `web3.eth.sendTransaction` because it will obfuscate the result
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
            gas: hex(3141592)
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

        done();
      }
    );
  });

  it("should have correct return value when calling a method that reverts without message", function(done) {
    const { accounts, instance, provider } = context;

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
            gas: hex(3141592)
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

        done();
      }
    );
  });

  it("should have correct return value when calling a method that reverts without message", function(done) {
    const { accounts, instance, provider } = context;

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
            gas: hex(3141592)
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

        done();
      }
    );
  });

  it("should have correct return value when calling a method that reverts with message", function(done) {
    const { accounts, instance, provider } = context;

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
            gas: hex(3141592)
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
        done();
      }
    );
  });

  after("shutdown", function(done) {
    const { provider } = context;
    provider.close(done);
  });
});
