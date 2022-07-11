import { keccak } from "@ganache/utils";
import { BytesN, FixedBytesN, Handler } from "../src/handlers";

export type SignatureDetail = {
  solidity?: string;
  javascript?: string;
  params: string[];
  name: string;
};

export type FunctionDescriptor = {
  functionName: string;
  params: { type: string }[];
  consoleSolLogFunctionToCall: string;
};

export const combinatorTypes = [
  "address",
  "bool",
  "string memory",
  "uint256"
] as const;

// for compatibility with hardhat's console.log, which uses `int` instead of
// `int256`, we need to also include `int` aliases in the permutations.
type SolidityType = typeof primitiveTypes[number] | BytesN | "uint" | "int";

const primitiveTypes = [...combinatorTypes, "bytes memory", "int256"] as const;

/**
 * Hardhat abi encodes uint instead of uint256. This saves a couple of bytes,
 * but is incorrect.
 */
export const hardhatTypeAliases: Map<SolidityType, SolidityType> = new Map([
  ["uint256", "uint"],
  ["int256", "int"]
]);

const typeToHandlerMap: Map<SolidityType, Handler> = new Map([
  ["address", "address"],
  ["bool", "bool"],
  ["bytes memory", "bytes"],
  ["int", "int256"],
  ["int256", "int256"],
  ["string memory", "string"],
  ["uint", "uint256"],
  ["uint256", "uint256"],
  // generate bytes1 .. bytes32
  ...(Array.from({ length: 32 }, (_, i) => [
    `bytes${i + 1}` as BytesN,
    `fixedBytes(${i + 1})` as FixedBytesN
  ]) as [BytesN, FixedBytesN][])
]);

const COMMENT = `
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
 * A cache used to ensure we do not accidentally generate multiple Solidity
 * function signatures that result in the same "4-byte".
 *
 * It is technically possible that `keccak("log(< some params >)").slice(0, 4)` and
 * `keccak("log(< other params >)").slice(0, 4)` could be identical. In the
 * very unlikely event that this happens we'll need to rename the signature so
 * it no longer results in a "4-byte" collision.
 *
 * Note: this cache is only being used to detect "4-byte" signature collisions.
 */
const signatureCache: Map<number, string> = new Map();

/**
 * Generates the solidity and javascript function signatures for a given set of
 * params.
 * @param params
 * @param solidityFunctionName
 * @returns
 */
function getSignature(
  params: SolidityType[],
  solidityFunctionName = "log"
): SignatureDetail {
  const abiParams = params.map(type => type.replace(" memory", ""));
  const abiSignatureString = `log(${abiParams.join(",")})`;
  // the solidity "4-bytes" signature:
  const signature = keccak(Buffer.from(abiSignatureString)).subarray(0, 4);

  // we store the signature as an int on the JS side:
  const signatureInt = parseInt(signature.toString("hex"), 16);

  /* istanbul ignore if */
  if (signatureCache.has(signatureInt)) {
    // we have things like `logUint256(uint256)`, log(uint256), etc, that are
    // *supposed* to generate the exact same abi signature, so the 4-bytes will
    // match. We only want to throw if the signatures themselves differ while
    // the 4-bytes match.
    if (signatureCache.get(signatureInt) !== abiSignatureString) {
      // if we've already generated this signature before throw!
      throw new Error(
        `Signature collision detected between log(${abiSignatureString}) and ???(${signatureCache.get(
          signatureInt
        )})`
      );
    }
  }
  signatureCache.set(signatureInt, abiSignatureString);

  const names =
    params.length === 1 ? ["value"] : params.map((_, i) => `value${i + 1}`);
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
    javascript,
    params,
    name: solidityFunctionName
  };
}

function getNamedLogFunctionName(type: SolidityType) {
  const logName = `log${
    type[0].toUpperCase() + type.replace(" memory", "").slice(1)
  }`;
  return logName;
}

/**
 * Generates signature code as `logString(string memory)`or `logAddress(address)`
 * instead of just `log(string memory)` or `log(address)`.
 *
 * Might yield multiple signatures, like `"logUint256"` and `"logUint"` for
 * `solidityType` `"uint256"`.
 *
 * @param solidityType
 */
function* getNamedSignature(solidityType: SolidityType) {
  const logName = getNamedLogFunctionName(solidityType);
  yield getSignature([solidityType], logName);

  if (hardhatTypeAliases.get(solidityType)) {
    const alias = hardhatTypeAliases.get(solidityType);
    const aliasLogName = getNamedLogFunctionName(alias);
    const soliditySignature = getSignature([solidityType], aliasLogName);
    delete soliditySignature.javascript;
    const javascriptSignature = getSignature([alias], aliasLogName);
    delete javascriptSignature.solidity;
    yield soliditySignature;
    yield javascriptSignature;
  }
}

/**
 * Combines the array of types into every permutation of types from length 1 to
 * array.length.
 * @param array
 */
function* permute<T extends SolidityType>(array: T[] | readonly T[]) {
  for (let i = 0; i < array.length; i++) {
    const length = Math.pow(array.length, i + 1);
    for (let j = 0; j < length; j++) {
      const parameters: SolidityType[] = [];

      for (let k = i; k >= 0; k--) {
        const denominator = Math.pow(array.length, k);
        const index = Math.floor(j / denominator) % array.length;
        const type = array[index];
        parameters.push(type);
      }
      yield getSignature(parameters);

      // generate javascript signature handlers for hardhat's uint/int
      // signatures
      if (parameters.some(p => hardhatTypeAliases.has(p))) {
        const aliasParams = parameters.map(p =>
          hardhatTypeAliases.has(p) ? hardhatTypeAliases.get(p) : p
        );
        const aliasSignature = getSignature(aliasParams);
        // we don't want to include alias solidity signatures because they would
        // just automatically be compiled to the uint256 and int256 versions
        // anyway; the signatures are the same.
        delete aliasSignature.solidity;
        yield aliasSignature;
      }
    }
  }
}

export function* getSignatures() {
  const emptyLog = getSignature([]);
  yield emptyLog;

  // logString(string value), logBytes(bytes value), etc.
  for (const signatures of primitiveTypes.map(getNamedSignature)) {
    for (const signature of signatures) yield signature;
  }

  // logBytes1(bytes1 value1) ... logBytes32(bytes1 value1)
  for (let n = 1; n <= 32; n++) {
    yield getSignature([`bytes${n}` as any], `logBytes${n}`);
  }

  // all possible permutations of combinatorTypes:
  for (const signature of permute(combinatorTypes)) yield signature;
}
