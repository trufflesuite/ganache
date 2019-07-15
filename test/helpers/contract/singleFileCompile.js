const { readFileSync } = require("fs");
const { compile } = require("solc");
const { join } = require("path");

module.exports = function singleFileCompile(filepath, contractName) {
  const filename = `${contractName}.sol`;
  const input = {
    language: "Solidity",
    sources: {},
    settings: {
      outputSelection: {
        "*": {
          "*": ["*"]
        }
      }
    }
  };
  const source = readFileSync(join(__dirname, "../../..", filepath, filename), { encoding: "utf8" });
  input.sources[filename] = {
    content: source
  };
  return { result: JSON.parse(compile(JSON.stringify(input))), source };
};
