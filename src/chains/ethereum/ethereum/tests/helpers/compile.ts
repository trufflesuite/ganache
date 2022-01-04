import solc, { CompilerInputSourceCode, CompilerInputSourceFile } from "solc";

{
  // Clean up after solc. Looks like this never really got fixed:
  // https://github.com/chriseth/browser-solidity/issues/167
  const listeners = process.listeners("unhandledRejection");
  const solcListener = listeners[listeners.length - 1];
  if (solcListener && solcListener.name === "" && solcListener.length === 1) {
    process.removeListener("unhandledRejection", solcListener);
  } else {
    throw new Error(
      "Looks like either the solc listener was finally removed, or they changed the name. Check it!"
    );
  }
}

import { readFileSync } from "fs-extra";
import { parse } from "path";

export type CompileOutput = {
  code: string;
  contract: solc.CompilerOutputContracts[string][string];
  imports: solc.CompilerOutputContracts;
};

type ContractPath = string;
type Imports = ContractPath[];
type Sources = {
  [globalName: string]: CompilerInputSourceFile | CompilerInputSourceCode;
};

export default function compile(
  contractPath: ContractPath,
  {
    contractName = null,
    imports = []
  }: {
    contractName?: string;
    imports?: Imports;
  } = {}
): CompileOutput {
  const parsedPath = parse(contractPath);
  const content = readFileSync(contractPath, "utf8");
  const globalName = parsedPath.base;
  contractName ||= parsedPath.name;
  const sources = imports.reduce<Sources>(
    (o, p) => ((o[parse(p).base] = { content: readFileSync(p, "utf8") }), o),
    {}
  );

  const result = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources: {
          [globalName]: {
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
      } as solc.CompilerInput)
    )
  ) as solc.CompilerOutput;

  if (
    result.errors &&
    result.errors.some(error => error.severity === "error")
  ) {
    throw new Error(result.errors.map(e => e.formattedMessage).join("\n\n"));
  }

  const contract = result.contracts[globalName][contractName];
  const importSources = result.contracts;
  delete importSources[globalName];
  return {
    code: "0x" + contract.evm.bytecode.object,
    contract,
    imports: importSources
  };
}
