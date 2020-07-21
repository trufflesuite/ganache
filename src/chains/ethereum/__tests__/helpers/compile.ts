
import solc from "solc";
import { readFileSync } from "fs-extra";
import { parse } from "path";

export default function compile(contractPath: string, contractName?: string) {
  const parsedPath = parse(contractPath);
  const content = readFileSync(contractPath, {encoding: "utf8"});
  const globalName = parsedPath.base;
  contractName ||= parsedPath.name;

  let result = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources: {
          [globalName]: {
            content
          }
        },
        settings: {
          outputSelection: {
            "*": {
              "*": ["*"]
            }
          }
        }
      } as solc.CompilerInput)
    )
  ) as solc.CompilerOutput;

  const contract = result.contracts[globalName][contractName];
  return {
    code: "0x" + contract.evm.bytecode.object,
    contract
  };
}