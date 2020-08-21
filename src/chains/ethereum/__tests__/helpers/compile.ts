
import solc from "solc";

// Clean up after solc. Looks like this never really got fixed:
// https://github.com/chriseth/browser-solidity/issues/167
var listeners = process.listeners("unhandledRejection");
var solc_listener = listeners[listeners.length - 1];
process.removeListener("unhandledRejection", solc_listener);

import { readFileSync } from "fs-extra";
import { parse } from "path";

export type CompileOutput = {
  code:string;
  contract:solc.CompilerOutputContracts[string][string]
}

export default function compile(contractPath: string, contractName?: string):CompileOutput {
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