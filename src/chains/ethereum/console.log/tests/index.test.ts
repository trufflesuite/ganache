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

  /**
   * Hooks into ganache's log function and compares its output to what is
  // expected (`params`).
   * @param params 
   * @returns 
   */
  async function collectLogs() {
    const allLogs: any[] = [];

    // start listening for logs
    logger.log = (...logs: any[]) => {
      allLogs.push(logs);
    };

    // we're done listening to logs once the transaction completes
    await provider.once("ganache:vm:tx:after");
    logger.log = () => {};
    return allLogs;
  }

  async function runTest(
    params: Param[] | null,
    method: string,
    contractAddress: string
  ) {
    const snapshotId = await provider.request({
      method: "evm_snapshot",
      params: []
    });
    try {
      // send our logging transaction
      const transactionPromise = provider.send("eth_sendTransaction", [
        {
          from,
          to: contractAddress,
          data: "0x" + method + encode(params).toString("hex")
        }
      ]);

      // collection all logs during the transaction's execution
      const allLogs = await collectLogs();

      if (params == null) {
        // if params is null we shouldn't have collected any logs
        assert.strictEqual(allLogs.length, 0);
      } else {
        // ensure we logged the right things
        assert.deepStrictEqual(
          allLogs[0],
          params.map(p => p.value)
        );
      }

      const txHash = await transactionPromise;
      const receipt = await provider.send("eth_getTransactionReceipt", [
        txHash
      ]);
      assert.strictEqual(
        receipt.status,
        "0x1",
        "Transaction didn't complete successfully"
      );
    } finally {
      logger.log = () => {};
      await provider.request({
        method: "evm_revert",
        params: [snapshotId]
      });
    }
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
          await runTest(params, method, contractAddress);
        }),
        {
          numRuns: 50,
          endOnFailure: true
        }
      );
    }).timeout(0);

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
            await runTest([param], method, contractAddress);
          }),
          { numRuns: 5, endOnFailure: true }
        );
      }).timeout(0);
    }
  });

  describe("static", () => {
    function generateBytesN(n: number): [string, any[]] {
      return [`bytes${n}`, ["0x" + "00".padEnd(n * 2, "0")]];
    }
    const staticValues = new Map([
      ["string memory", ["", "This string takes up more than 32 bytes"]],
      [
        "address",
        [
          "0xff00000000000000000000000000000000000000",
          "0x00000000000000000000000000000000000000ff"
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
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // 64 bytes
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
      this.timeout(0); // compilation may take many seconds
      const contractSource = createContract(functions);
      const code = compileContract(contractSource);
      contractAddress = await deploy(code);
    });

    it("doesn't log when console.sol is called adversarially or in odd ways", async () => {
      // when the `adversarialTest` test contract function is called `runTest`
      // should NOT detect any logs, the transaction should NOT fail, and
      // Ganache should not crash (or return an error).
      // basically this tests that Ganache doesn't do anything with adversarial
      // calls to the `console.log`.
      const method = get4ByteForSignature("adversarialTest()");
      await runTest(null, method, contractAddress);
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
            await runTest(args, method, contractAddress);
          });
        });
      });
    }
  });
});
