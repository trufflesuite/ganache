import solc from "solc";
import fc from "fast-check";
import { combinatorTypes } from "../scripts/helpers";
import { readFileSync } from "fs";
import { join } from "path";

export type FunctionDescriptor = {
  functionName: string;
  params: { type: string }[];
  consoleSolLogFunctionToCall: string;
};

/**
 * An arbitrary representing an `address` value
 * @returns
 */
const Address = () =>
  fc
    .hexaString({
      minLength: 40,
      maxLength: 40
    })
    .map(hash => ({ type: "address", value: `0x${hash}` }));

/**
 * An arbitrary representing a `bool` value
 * @returns
 */
const Bool = () => fc.boolean().map(b => ({ type: "bool", value: b }));

/**
 * An arbitrary representing a `string memory` value
 * @returns
 */
const StringMemory = () =>
  fc.string().map(value => ({ type: "string memory", value }));

/**
 * An arbitrary representing a `uint256` (aka `uint`) value
 * @returns
 */
const Uint256 = () =>
  fc.bigUint(2n ** 256n - 1n).map(value => ({ type: "uint256", value }));

/**
 * An arbitrary representing an `int256` (aka `int`) value
 * @returns
 */
const Int256 = () =>
  fc
    .bigInt(-(2n ** 255n), 2n ** 255n - 1n)
    .map(value => ({ type: "int256", value }));

/**
 * An arbitrary representing a `bytes memory` value
 * @returns
 */
const BytesMemory = () =>
  fc.uint8Array({ minLength: 1 }).map(b => ({
    type: "bytes memory",
    value: `0x${Buffer.from(b).toString("hex")}`
  }));

/**
 * An array of the arbitraries that can be used in combinator log signatures,
 * e.g. `log(string memory value1, address value2, uint256 value3)`
 * @returns
 */
const CombinatorArbs: (() => fc.Arbitrary<{
  type: string;
  value: string | boolean | bigint;
}>)[] = [Address, Bool, StringMemory, Uint256];

/**
 * Gets a random arbitrary from the list of combinator arbitraries.
 *
 * e.g. `Address`, `Bool`, `StringMemory`, or `Uint256`
 * @returns
 */
const RandomCombinatorArgumentsArb = () =>
  fc.nat({ max: combinatorTypes.length - 1 }).chain(i => CombinatorArbs[i]());

/**
 * Gets a random set of arbitraries from the list of combinator arbitraries.
 *
 * e.g. [Address, Bool], [StringMemory], [Uint256, Uint256, Bool, Address], etc.
 * @returns
 */
export const RandomCombinatorLogParams = () =>
  fc.array(RandomCombinatorArgumentsArb(), {
    minLength: 1,
    maxLength: combinatorTypes.length
  });

/**
 * Generates a source code for a contract that uses the specified log function
 * name and params.
 *
 * Example:
 *
 * ```solidity
 * // SPDX-License-Identifier: MIT
 * pragma solidity >= 0.4.22 <0.9.0;
 *
 * import "console.sol";
 *
 * contract Arbitrary {
 *   function testLog(string memory value) public view {
 *     console.log(value);
 *   }
 * }
 * ```
 *
 * @returns
 */
export const createContract = (functions: FunctionDescriptor[]) => {
  const functionStrings = functions.map(
    ({ functionName, params, consoleSolLogFunctionToCall }) => {
      return `  function ${functionName}(${params
        .map((p, i) => `${p.type} a${i}`)
        .join(", ")}) public view {
      console.${consoleSolLogFunctionToCall}(${params
        .map((_, i) => `a${i}`)
        .join(", ")});
  }`;
    }
  );
  return `// SPDX-License-Identifier: MIT
pragma solidity >= 0.4.22 <0.9.0;

import "console.sol";

contract Arbitrary {
${functionStrings.join("\n\n")}
}`;
};

export const compileContract = (contractSource: string) => {
  const contractName = "Arbitrary";
  const sources = {
    "console.sol": {
      content: readFileSync(join(__dirname, "../", "console.sol"), "utf8")
    }
  };

  const { contracts, errors } = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources: {
          [contractName]: {
            content: contractSource
          },
          ...sources
        },
        settings: {
          outputSelection: {
            "*": {
              "*": ["*"]
            }
          }
        }
      })
    )
  );

  if (errors && errors.some(error => error.severity === "error")) {
    throw new Error(errors.map(e => e.formattedMessage).join("\n\n"));
  }

  const contract = contracts[contractName][contractName];
  delete contracts[contractName];

  return "0x" + contract.evm.bytecode.object;
};

/**
 * A mapping from log function name to an arbitrary that can be used to create
 * a value for that log function
 */
export const primitiveArbitraries = new Map<
  string,
  () => fc.Arbitrary<{ type: string; value: string | boolean | bigint }>
>([
  ["logAddress", Address],
  ["logBool", Bool],
  ["logString", StringMemory],
  ["logUint256", Uint256],
  ["logInt256", Int256],
  ["logBytes", BytesMemory]
]);

// append the logBytes{1-32} arbitraries
for (let n = 1; n <= 32; n++) {
  primitiveArbitraries.set(`logBytes${n}`, () => {
    return fc.uint8Array({ minLength: n, maxLength: n }).map(value => ({
      type: `bytes${n}`,
      value: `0x${Buffer.from(value).toString("hex")}`
    }));
  });
}
