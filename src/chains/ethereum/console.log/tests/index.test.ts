import fc from "fast-check";
import assert from "assert";
import memdown from "memdown";
import Ganache, { EthereumProvider } from "../../../../packages/core";
import { RandomCombinatorLogParams, primitiveArbitraries } from "./arbitraries";
import {
  getSignatures,
  FunctionDescriptor,
  hardhatTypeAliases
} from "../scripts/helpers";
import { signatureMap } from "../src/signatures";
import {
  Param,
  encode,
  get4ByteForSignature,
  toAbiType,
  format,
  zip,
  compileContract,
  createContract,
  CONTRACT_NAME
} from "./helpers";

describe("@ganache/console.log", () => {
  const logger = {
    log: () => {}
  };
  let snapshotId: string;
  let provider: EthereumProvider;
  let from: string;

  before("set up a ganache provider", function () {
    provider = Ganache.provider({
      wallet: { deterministic: true, totalAccounts: 1 },
      miner: { blockGasLimit: "0xfffffffff" },
      logging: { logger },
      chain: { allowUnlimitedContractSize: true },
      // using memdown for performance
      database: { db: memdown() }
    });
  });

  before("get our account address", function () {
    [from] = Object.keys(provider.getInitialAccounts());
  });

  after("shut down the provider", async () => {
    provider && (await provider.disconnect());
    provider = null;
  });

  beforeEach("snapshot", async () => {
    snapshotId = await provider.request({
      method: "evm_snapshot",
      params: []
    });
  });

  afterEach("revert", async () => {
    snapshotId &&
      (await provider.request({
        method: "evm_revert",
        params: [snapshotId]
      }));
    snapshotId = null;
  });

  /**
   * Deploys the given 0x-prefixed code to the provider and returns the
   * `contractAddress`.
   * @param code
   * @returns
   */
  async function deploy(code: string) {
    const transactionHash = await provider.send("eth_sendTransaction", [
      {
        from,
        data: code,
        gas: "0xfffffff"
      } as any
    ]);

    const { status, contractAddress } = await provider.send(
      "eth_getTransactionReceipt",
      [transactionHash]
    );
    assert.strictEqual(status, "0x1", "Contract was not deployed");
    return contractAddress;
  }

  async function sendLoggingTransaction(
    params: Param[][] | null,
    method: string,
    contractAddress: string
  ) {
    // send our logging transaction
    return provider.send("eth_sendTransaction", [
      {
        from,
        to: contractAddress,
        data:
          "0x" + method + encode(params ? params.flat() : null).toString("hex")
      }
    ]);
  }

  /**
   * Throws if the given logs aren't a match for the given `expectedParamGroups`
   *
   * If `expectedParamGroups` is `null`, `logs` is expected to be an empty array
   * (`length === 0`).
   *
   * A Solidity contract with the following `console.log` statements:
   *
   * ```solidity
   *   console.log("Hello", "World");
   *   console.log(1234, 42);
   * ```
   *
   * should generate `logs` that match:
   *
   * ```javascript
   * [
   *   ["Hello", "World"],
   *   [1234, 42]
   * ]
   * ```
   *
   * while `expectedParamGroups` should be:
   *
   * ```javascript
   * [
   *   [{type: "string", value: "Hello"}, {type: "string", value: "World"}],
   *   [{type: "uint256", value: 1234}, {type: "uint256", value: 42}]
   * ]
   * ```
   *
   * @param logs
   * @param expectedParamGroups
   */
  function assertLogs(logs: any[][], expectedParamGroups: Param[][] | null) {
    if (expectedParamGroups == null) {
      // if params is null we shouldn't have collected any logs
      assert.strictEqual(logs.length, 0);
    } else {
      assert.deepStrictEqual(logs.length, expectedParamGroups.length);
      assert.deepStrictEqual(
        logs,
        expectedParamGroups.map(set => set.map(p => p.value))
      );
    }
  }

  /**
   * Collects all logs emitted via the `ganache:vm:tx:console.log` event as well
   * as logs sent to `logger.log`. If the logs from each source do not match
   * each other this function throws.
   *
   * This function also validates that the `context` object emitted by the
   * `before`, `after`, and `log` are strictly equal to each other. If they do
   * not match this function throws (this could be a bug in the test -- two
   * transactions/calls could be running at the same time, or a bug in Ganache's
   * event system).
   *
   * @returns all logs collected over the very next transaction event lifecycle
   * for the `provider` (contextual)
   */
  async function watchForLogs() {
    // collection all logs during the transaction's execution
    const allLogs: any[] = [];
    const eventLogs: any[] = [];

    const { context: beforeContext } = await provider.once(
      "ganache:vm:tx:before"
    );

    const unsubLogs = provider.on(
      "ganache:vm:tx:console.log",
      ({ context: logContext, logs }) => {
        assert.strictEqual(
          logContext,
          beforeContext,
          "`console.log` event context did not match transaction `before` context"
        );
        eventLogs.push(logs);
      }
    );

    // start listening for logs
    logger.log = (...logs: any[]) => {
      allLogs.push(logs);
    };

    // we're done listening to logs once the transaction completes
    try {
      const { context: afterContext } = await provider.once(
        "ganache:vm:tx:after"
      );
      assert.strictEqual(
        afterContext,
        beforeContext,
        "`after` event context did not match `before` context"
      );
    } finally {
      logger.log = () => {};
    }
    unsubLogs();
    assert.deepStrictEqual(
      eventLogs,
      allLogs,
      "logs emitted by `console.log` event didn't match logs captured via `logger.log`"
    );
    return allLogs;
  }

  async function runTxTest(
    params: Param[][] | null,
    method: string,
    contractAddress: string
  ) {
    const logsProm = watchForLogs();

    // send our logging transaction
    const transactionPromise = sendLoggingTransaction(
      params,
      method,
      contractAddress
    );

    assertLogs(await logsProm, params);

    const txHash = await transactionPromise;
    const receipt = await provider.send("eth_getTransactionReceipt", [txHash]);

    assert.strictEqual(
      receipt.status,
      "0x1",
      "Transaction didn't complete successfully"
    );

    return receipt;
  }

  describe("fast-check", () => {
    it("logs expected values for combinator signatures", async () => {
      await fc.assert(
        fc.asyncProperty(RandomCombinatorLogParams(), async params => {
          const functionName = "testLog";
          const contractSource = createContract([
            {
              params,
              functionName,
              consoleSolLogFunctionToCall: "log"
            }
          ]);
          const method = get4ByteForSignature(
            `${functionName}(${params.map(p => p.type).map(toAbiType)})`
          );
          const code = compileContract(contractSource);
          const contractAddress = await deploy(code);

          await runTxTest([params], method, contractAddress);
        }),
        {
          numRuns: 10,
          endOnFailure: true
        }
      );
    }).timeout(60000);

    for (const [key, arb] of primitiveArbitraries.entries()) {
      it(`logs expected values for ${key} signatures`, async () => {
        await fc.assert(
          fc.asyncProperty(arb(), async param => {
            const functionName = "testLog";
            const contractSource = createContract([
              {
                params: [param],
                functionName,
                consoleSolLogFunctionToCall: key
              }
            ]);
            const method = get4ByteForSignature(
              `${functionName}(${toAbiType(param.type)})`
            );
            const code = compileContract(contractSource);
            const contractAddress = await deploy(code);

            await runTxTest([[param]], method, contractAddress);
          }),
          { numRuns: 5, endOnFailure: true }
        );
      }).timeout(60000);
    }
  });

  describe("static", () => {
    function generateBytesN(n: number): [string, any[]] {
      return [`bytes${n}`, ["0x" + "00".repeat(n)]];
    }

    // `staticValues` generates 1000s of tests, adding a single additional
    // value increases test counts factorially
    const staticValues = new Map([
      ["string memory", ["", "This string takes up more than 32 bytes"]],
      [
        "address",
        [
          "0xff00000000000000000000000000000000000000", // preserves right padded
          "0x00000000000000000000000000000000000000ff" // preserves left padded
        ]
      ],
      ["bool", [true, false]],
      ["uint256", [0n, 2n ** 256n - 1n]],
      ["int256", [-(2n ** 255n), 0n, 2n ** 255n - 1n]],
      [
        "bytes memory",
        [
          "0x00ff", // preserves left padded
          "0xff00", // preserves right padded
          "0x" + "ff".repeat(64) // two words wide (64 bytes)
        ]
      ],
      ...Array.from({ length: 32 }).map((_, i) => generateBytesN(i + 1))
    ]);

    function getCartesianProduct(args: any[][]) {
      const product: any[][] = [];
      const max = args.length - 1;
      if (max === -1) return [[]];

      function helper(arr: any[], i: number) {
        for (let j = 0, l = args[i].length; j < l; j++) {
          const clone = arr.slice(0); // clone arr
          clone.push(args[i][j]);
          if (i === max) product.push(clone);
          else helper(clone, i + 1);
        }
      }
      helper([], 0);
      return product;
    }

    let contractAddress: string;
    const functions: FunctionDescriptor[] = [];

    before("compile and deploy contract", async function () {
      this.timeout(60000); // compilation may take many seconds
      const contractSource = createContract(functions);
      const code = compileContract(contractSource);
      contractAddress = await deploy(code);
    });

    let counter = 0;
    for (const { params, name } of getSignatures()) {
      // don't test signatures with int and uint because our `console.sol`
      // doesn't use them as these types are only for hardhat's console.sol
      // compatibility.
      if (params.includes("int") || params.includes("uint")) continue;

      const functionName = `testLog${counter++}`;
      functions.push({
        params: params.map(type => ({ type })),
        functionName,
        consoleSolLogFunctionToCall: name
      });

      describe(`${name}(${params.join(", ")})`, () => {
        const possibleValues = params.map(param => staticValues.get(param));

        const method = get4ByteForSignature(
          `${functionName}(${params.map(toAbiType)})`
        );

        const cartesianProductOfAllValues = getCartesianProduct(possibleValues);
        cartesianProductOfAllValues.forEach(vals => {
          it(`with values: ${format(vals)}`, async () => {
            const args = zip(params, vals, (type, value) => ({ type, value }));
            await runTxTest([args], method, contractAddress);
          });
        });
      });
    }

    describe("miscellaneous", () => {
      const func = functions.find(
        f => f.params.length === 1 && f.params[0].type === "string memory"
      );
      const method = get4ByteForSignature(`${func.functionName}(string)`);
      const params = [{ type: func.params[0].type, value: "Hello, World!" }];

      it("doesn't log when console.sol is called adversarially or in odd ways", async () => {
        // when the `adversarialTest` test contract function is called
        // `runTxTest` should NOT detect any logs, the transaction should NOT
        // fail, and Ganache should not crash (or return an error).
        // basically this tests that Ganache doesn't do anything with adversarial
        // calls to the `console.log`.
        const method = get4ByteForSignature("adversarialTest()");
        await runTxTest(null, method, contractAddress);
      });

      it("logs when `console.log` is called within an `eth_call`", async () => {
        const logsProm = watchForLogs();
        await provider.send("eth_call", [
          {
            from,
            to: contractAddress,
            data: "0x" + method + encode(params).toString("hex")
          }
        ]);
        assertLogs(await logsProm, [params]);
      });

      it("does NOT log when `console.log` is called within an `eth_estimateGas`", async () => {
        const allLogs = [];
        logger.log = (...logs: any[]) => {
          if (logs[0] === "eth_estimateGas") return;

          allLogs.push(logs);
        };
        try {
          const result = await provider.send("eth_estimateGas", [
            {
              from,
              to: contractAddress,
              data: "0x" + method + encode(params).toString("hex")
            }
          ]);
          assert.notEqual(result, "0x");
          assert.strictEqual(allLogs.length, 0);
        } finally {
          logger.log = () => {};
        }
      });

      it("does NOT log when `console.log` is called within a `debug_traceTransaction`", async () => {
        const txHash = await sendLoggingTransaction(
          [params],
          method,
          contractAddress
        );

        const logsProm = watchForLogs();
        // execute our logging tx via `debug_traceTransaction`
        await provider.send("debug_traceTransaction", [txHash]);

        // make sure it didn't log
        assertLogs(await logsProm, null);
      });

      it("logs when multiple console.log statements are in one transaction", async () => {
        const params = [
          [{ type: "string", value: "Hello" }],
          [{ type: "uint256", value: 123456n }]
        ];
        const code = compileContract(`// SPDX-License-Identifier: MIT
pragma solidity >= 0.4.22 <0.9.0;

import "console.sol";

contract ${CONTRACT_NAME} {
  function testLog(string memory value1, uint256 value2) public view {
    console.log(value1);
    console.log(value2);
  }
}`);

        const contractAddress = await deploy(code);
        const method = get4ByteForSignature(`testLog(string,uint256)`);
        await runTxTest(params, method, contractAddress);
      }).timeout(10000); // github action's mac runner is slow

      describe("debug_storageRangeAt", () => {
        beforeEach("stop the miner", async () => {
          // we need to send two transactions in one block, so we stop the miner
          // so we can add them to the pool:
          await provider.send("miner_stop");
        });

        afterEach("start the miner", async () => {
          await provider.send("miner_start");
        });

        it("does NOT log when `console.log` is called within a `debug_storageRangeAt`", async () => {
          // note: this test is borderline silly to have, because the
          // `debug_storageRangeAt` implementation never listens to the EVM step
          // event, so it can't possibly call console.log. Leaving the test in
          // despite this to help prevent future regressions.

          // send first transaction to pool:
          await sendLoggingTransaction([params], method, contractAddress);

          // send second transaction to pool:
          const txHash = await sendLoggingTransaction(
            [params],
            method,
            contractAddress
          );

          // mine them both:
          await provider.send("evm_mine");

          const receipt = await provider.send("eth_getTransactionReceipt", [
            txHash
          ]);
          assert.strictEqual(receipt.status, "0x1");
          assert.strictEqual(receipt.transactionIndex, "0x1");

          const allLogs = [];
          logger.log = (...logs: any[]) => {
            if (logs[0] === "debug_storageRangeAt") return;
            allLogs.push(logs);
          };
          try {
            // execute our logging tx via `debug_storageRangeAt`
            await provider.send("debug_storageRangeAt", [
              receipt.blockHash,
              parseInt(receipt.transactionIndex, 16),
              receipt.to,
              "0x00",
              1
            ]);
            assert.strictEqual(allLogs.length, 0);
          } finally {
            logger.log = () => {};
          }
        });
      });

      it("uses minimal gas", async () => {
        const receipt = await runTxTest([params], method, contractAddress);

        // Our expectation of the amount of gas used may need to be updated as new
        // hardforks are added and other changes happen. This gas amount is a
        // sanity check to ensure we don't accidentally introduce an expensive
        // change into our console.sol contract. It doesn't _have_ to be this
        // value; just keep it sane.
        //
        // Expected value for "log(Hello, World!)" at time of writing this
        // comment: 26_071.
        assert.strictEqual(parseInt(receipt.gasUsed, 16), 26_071);
      });

      describe("hardhat aliases", () => {
        for (const [type, alias] of hardhatTypeAliases.entries()) {
          it(`handles hardhat alias signature for log(${type}) => log(${alias})`, () => {
            const aliasSignature = parseInt(
              get4ByteForSignature(`log(${alias})`),
              16
            );
            const signature = parseInt(
              get4ByteForSignature(`log(${type})`),
              16
            );
            assert.notStrictEqual(aliasSignature, signature);
            const aliasHandlers = signatureMap.get(aliasSignature);
            const handlers = signatureMap.get(aliasSignature);
            assert.deepStrictEqual(aliasHandlers, handlers);
          });
        }
      });
    });
  });
});
