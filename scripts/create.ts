// TODO: make this its own package?

import chalk from "chalk";
import yargs from "yargs";
import prettier from "prettier";
import camelCase from "camelcase";
import npmValiddate from "validate-npm-package-name";
import userName from "git-user-name";
import { sep, join, resolve } from "path";
import { highlight } from "cli-highlight";
import { mkdir, mkdirSync, writeFile } from "fs-extra";
import {
  lstatSync as lstat,
  readdirSync as readDir,
  readFileSync as readFile
} from "fs";

const isDir = (s: string) => lstat(s).isDirectory();
const getDirectories = (s: string) => readDir(s).filter(n => isDir(join(s, n)));

const COLORS = {
  Bold: "\x1b[1m",
  Reset: "\x1b[0m",
  FgRed: "\x1b[31m"
};

let locations = getDirectories(join(__dirname, "../src")).filter(
  d => d !== "chains"
);
const chainLocations = getDirectories(join(__dirname, "../src/chains")).map(
  d => `chains/${d}`
);
locations = locations.concat(chainLocations);
const argv = yargs
  .command(
    `$0 <name> [options]`,
    `Create a new package in the given location with the provided name.`,
    yargs => {
      return yargs
        .usage(
          chalk`{hex("#e4a663").bold Create a new package in the given location with the provided name.}\n\n` +
            chalk`{bold Usage}\n  {bold $} {dim <}name{dim >} {dim [}options{dim ]}`
        )
        .positional("name", {
          describe: `The name of the new package`,
          type: "string",
          demandOption: true
        })
        .option("location", {
          alias: "l",
          describe: `The location for the new package.`,
          choices: locations,
          type: "string",
          demandOption: true
        })
        .option("folder", {
          alias: "f",
          default: null,
          describe: `Optional override for the folder name of the package instead of using <name>`,
          type: "string"
        });
    }
  )
  .demandCommand()
  .version(false)
  .help(false)
  .updateStrings({
    "Not enough non-option arguments: got %s, need at least %s": {
      one: chalk`{red {bold ERROR! Not enough non-option arguments:}\n  got %s, need at least %s}`,
      other: chalk`{red {bold ERROR! Not enough non-option arguments:}\n  got %s, need at least %s}`
    } as any,
    "Invalid values:": `${COLORS.FgRed}${COLORS.Bold}ERROR! Invalid values:${COLORS.Reset}${COLORS.FgRed}`
  })
  .fail((msg, err, yargs) => {
    // we use a custom `fail` fn so that NPM doesn't print its own giant error message.
    if (err) throw err;

    console.error(yargs.help().toString().replace("\n\n\n", "\n"));
    console.error();
    console.error(msg);
    process.exit(0);
  }).argv;
process.stdout.write(`${COLORS.Reset}`);

(async function () {
  let name = argv.name;
  const location = argv.location;
  const folderName = argv.folder as null | string;

  const nameValidation = npmValiddate(name);
  if (!nameValidation.validForNewPackages) {
    throw new Error(
      `the name "${name}" is not a valid npm package name:\n${nameValidation.errors}`
    );
  }

  // determines how many `../` are needed for package contents
  const numDirectoriesAwayFromRoot = 3 + location.split(sep).length;
  const relativePathToRoot = "../".repeat(numDirectoriesAwayFromRoot);

  try {
    const workspaceDir = join(__dirname, "../");
    const LICENSE = readFile(join(workspaceDir, "LICENSE"), "utf-8");

    const prettierConfig = await prettier.resolveConfig(process.cwd());

    const packageName = `@ganache/${name}`;
    let packageAuthor = userName();
    const version = "0.1.0";

    const pkg = {
      name: packageName,
      version,
      description: "",
      author: packageAuthor || require("../package.json").author,
      homepage: `https://github.com/trufflesuite/ganache-core/tree/develop/src/${location}/${
        folderName || name
      }#readme`,
      license: "MIT",
      main: "lib/index.js",
      types: "src/index.ts",
      source: "index.ts",
      directories: {
        lib: "lib",
        test: "test"
      },
      files: ["lib"],
      repository: {
        type: "git",
        url: "https://github.com/trufflesuite/ganache-core.git",
        directory: `src/${location}/${folderName || name}`
      },
      scripts: {
        tsc: "ttsc",
        test: "nyc npm run mocha",
        mocha:
          "cross-env TS_NODE_COMPILER=ttypescript TS_NODE_FILES=true mocha --exit --check-leaks --throw-deprecation --trace-warnings --require ts-node/register 'tests/**/*.test.ts'"
      },
      bugs: {
        url: "https://github.com/trufflesuite/ganache-core/issues"
      },
      keywords: [
        "ganache",
        `ganache-${name}`,
        "ethereum",
        "evm",
        "blockchain",
        "smart contracts",
        "dapps",
        "solidity",
        "vyper",
        "fe",
        "web3",
        "tooling",
        "truffle"
      ]
    };

    const tsConfig = {
      extends: `${relativePathToRoot}tsconfig.json`,
      compilerOptions: {
        outDir: "lib"
      },
      include: ["src"]
    };

    const shrinkwrap = {
      name: packageName,
      version: version,
      lockfileVersion: 1
    };

    const testFile = `import assert from "assert";
import ${camelCase(name)} from "../src/";

describe("${packageName}", () => {
  it("needs tests");
})`;

    const indexFile = `export default {
  // TODO
}
`;

    const dir = join(workspaceDir, "src", location, folderName || name);
    const tests = join(dir, "tests");
    const src = join(dir, "src");

    function initSrc() {
      return writeFile(
        join(src, "index.ts"),
        prettier.format(indexFile, { ...prettierConfig, parser: "typescript" })
      );
    }

    function initIndex() {
      // When a bundler compiles our libs this headerdoc comment will cause that
      // tool to retain our LICENSE information in their bundled output.
      const headerdoc = `/*!
  * ${packageName}
  *
  * @copyright Truffle Blockchain Group
  * @author ${pkg.author}
  * @license ${pkg.license}
*/

`;
      return writeFile(
        join(dir, "index.ts"),
        prettier.format(headerdoc + indexFile, {
          ...prettierConfig,
          parser: "typescript"
        })
      );
    }

    function initRootFiles() {
      return Promise.all([
        writeFile(
          join(dir, ".npmignore"),
          `./index.ts
tests
.nyc_output
coverage
scripts
src
tsconfig.json
typedoc.json
`
        ),
        writeFile(join(dir, "LICENSE"), LICENSE)
      ]);
    }

    function initTests() {
      return writeFile(
        join(tests, "index.test.ts"),
        prettier.format(testFile, { ...prettierConfig, parser: "typescript" })
      );
    }

    const pkgStr = JSON.stringify(pkg, null, 2) + "\n";
    const pkgPath = join(dir, "package.json");

    console.log(`About to write to ${resolve(__dirname, pkgPath)}`);
    console.log("");

    mkdirSync(dir);

    await Promise.all([
      initRootFiles(),
      initIndex(),
      mkdir(tests).then(initTests),
      mkdir(src).then(initSrc),
      writeFile(
        join(dir, "tsconfig.json"),
        JSON.stringify(tsConfig, null, 2) + "\n"
      ),
      writeFile(
        join(dir, "README.md"),
        prettier.format(`# \`${packageName}\`\n> TODO: description`, {
          ...prettierConfig,
          parser: "markdown"
        })
      ),
      writeFile(pkgPath, pkgStr),
      writeFile(
        join(dir, "npm-shrinkwrap.json"),
        JSON.stringify(shrinkwrap) + "\n"
      )
    ]);

    console.log(
      highlight(pkgStr, {
        language: "json",
        theme: {
          attr: chalk.hex("#3FE0C5"),
          string: chalk.hex("#e4a663")
        }
      })
    );

    console.log(
      chalk`{green success} {magenta create} New package {bgBlack  ${name} } created at ./src/${location}/${
        folderName || name
      }.`
    );
    console.log("");
    console.log(
      chalk`  Update the package.json here: {bold ${dir}/package.json}`
    );
  } catch (e) {
    console.error(e);
    console.log("");
    console.log(
      chalk`{red fail} {magenta create} New package {bgBlack  ${name} } not created. See error above.`
    );
  }
})();
