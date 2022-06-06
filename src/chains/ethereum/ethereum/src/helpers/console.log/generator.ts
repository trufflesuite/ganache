import { keccak } from "@ganache/utils";

import { Handlers } from "./handlers";
type Handler = keyof typeof Handlers;
const HandlersKeys: Handler[] = Object.keys(Handlers) as Handler[];

function permutate<T>(value: readonly T[] | T[], max = value.length) {
  const depth = Math.min(max, value.length);
  const results: T[][] = [];

  const permute = (queue = []) => {
    if (queue.length === depth) {
      results.push(queue);
    } else {
      for (let ele of value) {
        permute(queue.concat(ele));
      }
    }
  };

  permute();
  return results;
}

function addSignatureToSignatureMap(args: Type[]) {
  // the solidity 4-bytes signature:
  const signature = keccak(
    Buffer.from(`log(${args.join(",")})`, "utf-8")
  ).slice(0, 4);

  // we store the signature as an int on the JS side:
  const signatureInt = parseInt(signature.toString("hex"), 16);

  // if we've already generated this signature before throw!
  if (signatureCache.has(signatureInt)) {
    throw new Error(
      `Signature collision detected between log(${args.join(
        ","
      )}) and log(${signatureCache.get(signatureInt)})`
    );
  }

  // `[[4byteAsInt], [...handler]]`
  signatureMap += `  [${signatureInt}, [${args
    .map(arg => typeToHandlerMap.get(arg))
    .join(", ")}]], // log(${args.join(",")})\n`;
}

function processPermutations(permutations: Type[][]) {
  permutations.forEach(addSignatureToSignatureMap);
}

let signatureMap = `new Map([\n`;

const basicTypes = ["address", "bool", "string memory", "uint256"] as const;

// for compatibility with hardhat's console.log, which uses `uint` instead of
// uint256, we need to also include `uint` aliases in the permutations.
type Type = typeof basicTypes[number] | "uint";
const typeAliases: Map<Type, Type> = new Map([["uint256", "uint"]]);

const typeToHandlerMap: Map<Type, Handler> = new Map([
  ["address", "address"],
  ["bool", "bool"],
  ["string memory", "string"],
  ["uint256", "uint256"],
  ["uint", "uint256"]
]);
const signatureCache: Map<number, string> = new Map();

const withAliases = basicTypes.map(type => typeAliases.get(type) || type);
processPermutations(permutate(basicTypes));
processPermutations(permutate(withAliases));

signatureMap += "])";

const file = `
/*
 * This file was automatically generated; do not edit.
 */

import { ${HandlersKeys.join(", ")} } from "./handlers";

export const signatureMap = ${signatureMap};
`;

console.log(file);
