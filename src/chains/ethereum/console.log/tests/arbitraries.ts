import solc from "solc";
import fc from "fast-check";
import { combinatorTypes } from "../scripts/helpers";
import { readFileSync } from "fs";
import { join } from "path";

const nBytes = () => fc.integer({ min: 1, max: 32 });

export const Address = () =>
  fc
    .hexaString({
      minLength: 40,
      maxLength: 40
    })
    .map(hash => ({ type: "address", value: `0x${hash}` }));

export const Bool = () => fc.boolean().map(b => ({ type: "bool", value: b }));

export const StringMemory = () =>
  fc.string().map(s => ({ type: "string memory", value: s }));

export const Uint256 = () =>
  fc.bigUint(2n ** 256n - 1n).map(u => ({ type: "uint256", value: u }));

export const CombinatorArbs: (() => fc.Arbitrary<{
  type: string;
  value: any;
}>)[] = [Address, Bool, StringMemory, Uint256];

export const RandomCombinatorArgumentsArb = () =>
  fc.nat({ max: combinatorTypes.length - 1 }).chain(i => CombinatorArbs[i]());

export const LogParams = () =>
  fc.array(RandomCombinatorArgumentsArb(), {
    minLength: 1,
    maxLength: combinatorTypes.length
  });

export const Int256 = () =>
  fc.bigInt(-(2n ** 255n), 2n ** 255n - 1n).map(i => ["int256", i]);

export const Bytes = () => ["bytes", fc.int8Array({ min: 0, max: 255 })];

export const BytesN = () =>
  fc
    .tuple(nBytes())
    .map(([n]) => [
      `bytes${n}`,
      fc.int8Array({ min: 0, max: 255, minLength: n, maxLength: n })
    ]);

/**
 * Generate a contract source code that uses the specified log function name and
 * params.
 *
 * The only public function name is `testLog`.
 *
 * Example return value:
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
 * @param params
 * @param consoleSolLogFunctionToCall
 * @returns
 */
export const Contract = (
  params: { type: string; value: string }[],
  consoleSolLogFunctionToCall = "log"
) => {
  return `// SPDX-License-Identifier: MIT
pragma solidity >= 0.4.22 <0.9.0;

import "console.sol";

contract Arbitrary {
  function testLog(${params
    .map((p, i) => `${p.type} a${i}`)
    .join(", ")}) public view {
    console.${consoleSolLogFunctionToCall}(${params
    .map((_, i) => `a${i}`)
    .join(", ")});
  }
}`;
};

export const compile = (content: string) => {
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
            content
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

  return {
    code: "0x" + contract.evm.bytecode.object,
    contract,
    imports: contracts
  };
};
