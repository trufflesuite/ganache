import { keccak } from "@ganache/utils";
import { BytesN, FixedBytesN, Handler } from "../src/handlers";

// for compatibility with hardhat's console.log, which uses `int` instead of
// `int256`, we need to also include `int` aliases in the permutations.
export type SolidityType =
  | typeof primitiveTypes[number]
  | BytesN
  | "uint"
  | "int";

export const combinatorTypes = [
  "address",
  "bool",
  "string memory",
  "uint256"
] as const;

export const primitiveTypes = [
  ...combinatorTypes,
  "bytes memory",
  "int256"
] as const;

/**
 * Hardhat abi encodes uint instead of uint256. This saves a couple of bytes,
 * but is incorrect.
 */
export const hardhatTypeAliases: Map<SolidityType, SolidityType[]> = new Map([
  ["uint256", ["uint"]],
  ["int256", ["int"]]
]);

export const typeToHandlerMap: Map<SolidityType, Handler> = new Map([
  ["address", "address"],
  ["bool", "bool"],
  ["bytes memory", "bytes"],
  ["int", "int256"],
  ["int256", "uint256"],
  ["string memory", "string"],
  ["uint", "uint256"],
  ["uint256", "uint256"],
  // generate bytes1 .. bytes32
  ...(Array.from({ length: 32 }, (_, i) => [
    `bytes${i + 1}` as BytesN,
    `fixedBytes(${i + 1})` as FixedBytesN
  ]) as [BytesN, FixedBytesN][])
]);

export const COMMENT = `
    /**
    * Prints to \`stdout\` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [\`printf(3)\`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to \`util.format()\`).
    *
    * \`\`\`solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * \`\`\`
    *
    * See \`util.format()\` for more information.
    */`;

/**
 * Cache used to ensure we do not accidentally generate 4 byte collisions.
 */
const signatureCache: Map<number, string> = new Map();
/**
 * Generates the solidity and javascript function signatures for a given set of
 * params.
 * @param params
 * @param solidityFunctionName
 * @returns
 */
export function getSignatureCode(
  params: SolidityType[],
  solidityFunctionName = "log"
) {
  const abiParams = params.map(type => type.replace(" memory", ""));
  const abiSignatureString = `log(${abiParams.join(",")})`;
  // the solidity 4-bytes signature:
  const signature = keccak(Buffer.from(abiSignatureString)).subarray(0, 4);

  // we store the signature as an int on the JS side:
  const signatureInt = parseInt(signature.toString("hex"), 16);

  // if we've already generated this signature before throw!
  if (signatureCache.has(signatureInt)) {
    throw new Error(
      `Signature collision detected between log(${params.join(
        ","
      )}) and log(${signatureCache.get(signatureInt)})`
    );
  }

  const names =
    params.length === 1
      ? ["value"]
      : params.map((_, i) => {
          return `value${i + 1}`;
        });
  const fullParamsWithNames = params.map((arg, i) => arg + " " + names[i]);
  const encodeArgs = [`"${abiSignatureString}"`, ...names];
  const printComment = params.length > 1 && abiParams[0] === "string";

  const solidity = `${printComment ? COMMENT : ""}
    function ${solidityFunctionName}(${fullParamsWithNames.join(
    ", "
  )}) internal view {
        _sendLogPayload(abi.encodeWithSignature(${encodeArgs.join(", ")}));
    }`;

  const javascriptHandlers = params.map(arg => typeToHandlerMap.get(arg));
  const javascript = `  // ${abiSignatureString}
  [${signatureInt}, [${javascriptHandlers.join(", ")}]]`;

  return {
    solidity,
    javascript
  };
}

/**
 * Generates signature code as `logString(string memory)`or `logAddress(address)`
 * instead of just `log(string memory)` or `log(address)`.
 * @param type
 */
export function* generateNamedSignatureCode(type: SolidityType) {
  const logName = `log${
    type[0].toUpperCase() + type.replace(" memory", "").slice(1)
  }`;
  yield getSignatureCode([type], logName);

  if (hardhatTypeAliases.get(type)) {
    const aliases = hardhatTypeAliases.get(type);
    for (const alias of aliases) {
      yield* generateNamedSignatureCode(alias);
    }
  }
}

/**
 * Combines the array of types into every permutation of types from length 1 to
 * array.length.
 * @param array
 */
export function* permute<T>(array: T[] | readonly T[]) {
  for (let i = 0; i < array.length; i++) {
    const length = Math.pow(array.length, i + 1);
    for (let j = 0; j < length; j++) {
      const parameters = [];

      for (let k = i; k >= 0; k--) {
        const denominator = Math.pow(array.length, k);
        const index = Math.floor(j / denominator) % combinatorTypes.length;
        const type = combinatorTypes[index];
        parameters.push(type);
      }
      yield getSignatureCode(parameters);
    }
  }
}
