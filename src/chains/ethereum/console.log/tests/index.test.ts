import fc from "fast-check";
import assert from "assert";
import Ganache, { EthereumProvider } from "../../../../packages/core";
import { rawEncode } from "ethereumjs-abi";
import {
  compileContract,
  createContract,
  RandomCombinatorLogParams,
  primitiveArbitraries,
  FunctionDescriptor
} from "./arbitraries";
import memdown from "memdown";
import { getSignatures } from "../scripts/helpers";
import { keccak } from "@ganache/utils";
import { formatWithOptions } from "util";

function get4ByteForSignature(signature: string) {
  return `${keccak(Buffer.from(signature)).subarray(0, 4).toString("hex")}`;
}

const format = formatWithOptions.bind(null, {
  breakLength: Infinity
});

function toAbiType(type: string) {
  return type.replace(" memory", "").replace(/^(int|uint)$/, "$1256");
}

describe("@ganache/console.log", () => {
  const logger = {
    log: () => {}
  };
  let provider: EthereumProvider;
  let from: string;

  before(function () {
    provider = Ganache.provider({
      wallet: { deterministic: true, totalAccounts: 1 },
      miner: { blockGasLimit: "0xfffffffff" },
      logging: { logger },
      chain: { allowUnlimitedContractSize: true },
      // using memdown for performance
      database: { db: memdown() }
    });
    [from] = Object.keys(provider.getInitialAccounts());
  });

  after(async () => {
    provider && (await provider.disconnect());
    provider = null;
  });

  async function deploy(code: string) {
    const transactionHash = await provider.send("eth_sendTransaction", [
      {
        from,
        data: code,
        gas: "0xfffffff"
      } as any
    ]);

    const { contractAddress } = await provider.send(
      "eth_getTransactionReceipt",
      [transactionHash]
    );
    return contractAddress;
  }

  function encode(
    params: {
      type: string;
      value: any;
    }[]
  ) {
    return rawEncode(
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
  async function assertLogsAsync(
    params: {
      type: string;
      value: any;
    }[]
  ) {
    let resolve: (value: void) => void, reject: (reason?: any) => void;
    const deferredPromise = new Promise<void>((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    // start listening for logs
    logger.log = (...logs: any[]) => {
      try {
        assert.deepStrictEqual(
          logs,
          params.map(p => p.value)
        );
        resolve();
      } catch (e) {
        console.log(logs, params);
        return void reject(e);
      } finally {
        logger.log = () => {};
      }
    };
    return deferredPromise;
  }

  async function runTest(
    params: {
      type: string;
      value: any;
    }[],
    method: string,
    contractAddress: string
  ) {
    logger.log = () => {};
    const snapshotId = await provider.request({
      method: "evm_snapshot",
      params: []
    });
    try {
      const values = encode(params);

      const prom = provider.send("eth_sendTransaction", [
        {
          from,
          to: contractAddress,
          data: "0x" + method + values.toString("hex")
        }
      ]);
      await assertLogsAsync(params);
      await prom;
    } catch (e) {
      console.error(e);
      throw e;
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
    const staticTestValues = new Map([
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

    let counter = 0;
    for (const signature of getSignatures()) {
      // we don't test signatures with int and uint because our `console.sol` doesn't use them
      // these types are only for hardhat support
      if (signature.params.includes("int") || signature.params.includes("uint"))
        continue;

      const functionName = `testLog${counter++}`;
      functions.push({
        params: signature.params.map(type => ({ type })),
        functionName,
        consoleSolLogFunctionToCall: signature.name
      });

      describe(`${signature.name}(${signature.params.join(", ")})`, () => {
        // special case for log()
        if (signature.params.length === 0) {
          it.only("log()", async () => {
            const method = get4ByteForSignature(`${functionName}()`);
            await runTest([], method, contractAddress);
          });
          return;
        }

        const allValues = signature.params.map(param => {
          return staticTestValues.get(param);
        });

        const products = getCartesianProduct(allValues);
        products.forEach(values => {
          it(`with values: ${format(values)}`, async () => {
            const params = values.map((value, i) => {
              return {
                type: signature.params[i],
                value
              };
            });
            const method = get4ByteForSignature(
              `${functionName}(${signature.params.map(toAbiType)})`
            );
            await runTest(params, method, contractAddress);
          });
        });
      });
    }
  });
});
