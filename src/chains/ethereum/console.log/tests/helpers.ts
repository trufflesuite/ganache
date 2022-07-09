import solc from "solc";
import { rawEncode } from "ethereumjs-abi";
import { keccak } from "@ganache/utils";
import { formatWithOptions } from "util";
import { readFileSync } from "fs";
import { join } from "path";
import { FunctionDescriptor } from "../scripts/helpers";

export const CONTRACT_NAME = "ConsoleLogTest";
const consoleSol = readFileSync(join(__dirname, "../", "console.sol"), "utf8");

export type Param = {
  type: string;
  value: any;
};

export const format = formatWithOptions.bind(null, {
  breakLength: Infinity
});

export function encode(params: Param[] | null) {
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
 * Generates the 4-byte signature for the given solidity signature string
 * e.g. `log(address)` => `2c2ecbc2`
 * @param signature
 * @returns
 */
export function get4ByteForSignature(signature: string) {
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
export function zip<T, U, V>(
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
export function toAbiType(type: string) {
  return type.replace(" memory", "").replace(/^(int|uint)$/, "$1256");
}

/**
 * Generates a source code for a contract that uses the specified log function
 * descriptors.
 *
 * Example:
 *
 * ```solidity
 * // SPDX-License-Identifier: MIT
 * pragma solidity >= 0.4.22 <0.9.0;
 *
 * import "console.sol";
 *
 * contract ConsoleLogTest {
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
      const sigParams = params.map(({ type }, i) => `${type} a${i}`).join(", ");
      const callParams = params.map((_, i) => `a${i}`).join(", ");
      return `  function ${functionName}(${sigParams}) public view {
    console.${consoleSolLogFunctionToCall}(${callParams});
  }`;
    }
  );
  return `// SPDX-License-Identifier: MIT
pragma solidity >= 0.4.22 <0.9.0;

import "console.sol";

contract ${CONTRACT_NAME} {
  function adversarialTest() public view {
    bytes memory badHandler = abi.encodeWithSignature("fake()");
    bytes memory badSignature = abi.encodeWithSignature("log(string)", -123456789);
    address consolePrecompile = address(0x000000000000000000636F6e736F6c652e6c6f67);
    address randomAddress = address(0x00000000000072616E646f6d2061646472657373);
    assembly {
      let badHandlerLength := mload(badHandler)
      let badHandlerOffset := add(badHandler, 32)
      pop(staticcall(gas(), consolePrecompile, badHandlerOffset, badHandlerLength, 0, 0)) // tests bad handler

      let badSigLength := mload(badSignature)
      let badSigOffset := add(badSignature, 32)
      pop(staticcall(gas(), consolePrecompile, badSigOffset, badSigLength, 0, 0)) // tests bad data

      pop(staticcall(gas(), consolePrecompile, 0, 0, 0, 0)) // tests short inLength
      pop(staticcall(gas(), consolePrecompile, 0, 4, 0, 0)) // tests no valid data in memory
      pop(staticcall(gas(), consolePrecompile, 999, 0, 0, 0)) // out of bounds memory read (offset)
      pop(staticcall(gas(), consolePrecompile, 0, 999, 0, 0)) // out of bounds memory read (length)
      pop(staticcall(gas(), randomAddress, 0, 0, 0, 0)) // ensure we don't listen to other contract addresses
    }
  }
${functionStrings.join("\n\n")}
}`;
};

export const compileContract = (contractSource: string) => {
  const sources = {
    "console.sol": {
      content: consoleSol
    }
  };

  const { contracts, errors } = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources: {
          [CONTRACT_NAME]: {
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

  /* istanbul ignore if */
  if (errors && errors.some(error => error.severity === "error")) {
    throw new Error(errors.map(e => e.formattedMessage).join("\n\n"));
  }

  const contract = contracts[CONTRACT_NAME][CONTRACT_NAME];
  return "0x" + contract.evm.bytecode.object;
};
