import fc from "fast-check";
import assert from "assert";
import Ganache, { EthereumProvider } from "../../../../packages/core";
import { rawEncode } from "ethereumjs-abi";
import { RandomCombinatorLogParams, primitiveArbitraries } from "./arbitraries";
import memdown from "memdown";
import {
  getSignatures,
  compileContract,
  createContract,
  FunctionDescriptor
} from "../scripts/helpers";
import { keccak } from "@ganache/utils";
import { formatWithOptions } from "util";

type Param = {
  type: string;
  value: any;
};

const format = formatWithOptions.bind(null, {
  breakLength: Infinity
});

/**
 * Generates the 4-byte signature for the given solidity signature string
 * e.g. `log(address)` => `2c2ecbc2`
 * @param signature
 * @returns
 */
function get4ByteForSignature(signature: string) {
  return `${keccak(Buffer.from(signature)).subarray(0, 4).toString("hex")}`;
}

/**
 * Creates an array of pairs built out of two underlying arrays using the given
 * `joiner` function.
 * @param array1
 * @param array2
 * @param joiner
 * @returns An array of tuple pairs, where the elements of each pair are corresponding elements of array1 and array2.
 */
function zip<T, U, V>(
  array1: T[],
  array2: U[],
  joiner: (a: T, b: U) => V
): V[] {
  return array1.map((e, i) => joiner(e, array2[i]));
}

/**
 * Normalizes a given solidity type, for example, `bytes memory` to just
 * `bytes` and `uint` to `uint256`.
 * @param type
 * @returns
 */
function toAbiType(type: string) {
  return type.replace(" memory", "").replace(/^(int|uint)$/, "$1256");
}

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
   * Deploys the given 0x prefixed code to the provider and returns the
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

  function encode(params: Param[]) {
    return params == null
      ? Buffer.alloc(0)
      : rawEncode(
          params.map(p => p.type).map(toAbiType),
          params.map(p => {
            if (
              p.type === "uint256" ||
              p.type === "int256" ||
              p.type === "uint" ||
              p.type === "int"
            ) {
              return `0x${p.value.toString(16)}`;
            } else if (p.type.startsWith("bytes")) {
              return Buffer.from(p.value.replace(/^0x/, ""), "hex");
            } else {
              return p.value;
            }
          })
        );
  }

  async function sendLoggingTransaction(
    params: Param[] | null,
    method: string,
    contractAddress: string
  ) {
    // send our logging transaction
    return provider.send("eth_sendTransaction", [
      {
        from,
        to: contractAddress,
        data: "0x" + method + encode(params).toString("hex")
      }
    ]);
  }

  function assertLogs(logs: any[], expectedParams: Param[] | null) {
    if (expectedParams == null) {
      // if params is null we shouldn't have collected any logs
      assert.strictEqual(logs.length, 0);
    } else {
      // ensure we logged the right things
      assert.deepStrictEqual(
        logs[0],
        expectedParams.map(p => p.value)
      );
    }
  }

  async function watchLogs() {
    // collection all logs during the transaction's execution
    const allLogs: any[] = [];

    await provider.once("ganache:vm:tx:before");

    // start listening for logs
    logger.log = (...logs: any[]) => {
      allLogs.push(logs);
    };

    // we're done listening to logs once the transaction completes
    try {
      await provider.once("ganache:vm:tx:after");
    } finally {
      logger.log = () => {};
    }
    return allLogs;
  }

  async function runTxTest(
    params: Param[] | null,
    method: string,
    contractAddress: string
  ) {
    const logsProm = watchLogs();

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

          await runTxTest(params, method, contractAddress);
        }),
        {
          numRuns: 10,
          endOnFailure: true
        }
      );
    }).timeout(30000);

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

            await runTxTest([param], method, contractAddress);
          }),
          { numRuns: 5, endOnFailure: true }
        );
      }).timeout(30000);
    }
  });

  describe("static", () => {
    function generateBytesN(n: number): [string, any[]] {
      return [`bytes${n}`, ["0x" + "00".padEnd(n * 2, "0")]];
    }

    // `staticValues` genenerates 1000s of tests, adding a single additional
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
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // two words wide (64 bytes)
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
      // compatability.
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
            await runTxTest(args, method, contractAddress);
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
        // when the `adversarialTest` test contract function is called `runTest`
        // should NOT detect any logs, the transaction should NOT fail, and
        // Ganache should not crash (or return an error).
        // basically this tests that Ganache doesn't do anything with adversarial
        // calls to the `console.log`.
        const method = get4ByteForSignature("adversarialTest()");
        await runTxTest(null, method, contractAddress);
      });

      it("logs when `console.log` is called within an `eth_call`", async () => {
        const logsProm = watchLogs();
        await provider.send("eth_call", [
          {
            from,
            to: contractAddress,
            data: "0x" + method + encode(params).toString("hex")
          }
        ]);
        assertLogs(await logsProm, params);
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
        } finally {
          logger.log = () => {};
        }
      });

      it("does NOT log when `console.log` is called within an `debug_traceTransaction`", async () => {
        const txHash = await sendLoggingTransaction(
          params,
          method,
          contractAddress
        );

        const logsProm = watchLogs();
        // execute our logging tx via `debug_traceTransaction`
        await provider.send("debug_traceTransaction", [txHash]);

        // make sure it didn't log
        assertLogs(await logsProm, null);
      });

      it("does NOT log when `console.log` is called within an `debug_storageRangeAt`", async () => {
        const txHash = await sendLoggingTransaction(
          params,
          method,
          contractAddress
        );
        const receipt = await provider.send("eth_getTransactionReceipt", [
          txHash
        ]);
        assert.strictEqual(receipt.status, "0x1");

        const logsProm = watchLogs();
        // execute our logging tx via `debug_storageRangeAt`
        const result = await provider.send("debug_storageRangeAt", [
          receipt.blockHash,
          parseInt(receipt.transactionIndex, 16),
          receipt.to,
          "0x00",
          1
        ]);

        // make sure it didn't log
        assertLogs(await logsProm, null);
        return result;
      });

      it("uses minimal gas", async () => {
        const receipt = await runTxTest(params, method, contractAddress);

        // Our expectation of the amount of gas used may need to be updated as new
        // hardforks are added and other changes happen. This gas amount is a
        // sanity check to ensure we don't accidentally introduce an expensive
        // change into our console.sol contract. It doesn't _have_ to be this
        // value; just keep it sane.
        //
        // Expected value for "log(Hello, World!)" at time of writing this
        // comment: 26_070.
        assert.strictEqual(parseInt(receipt.gasUsed, 16), 26_070);
      });
    });
  });
});
