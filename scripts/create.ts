import { TruffleColors } from "../src/packages/colors";
import { sep, join, resolve } from "path";
import { highlight } from "cli-highlight";
import { mkdir, mkdirSync, writeFile } from "fs-extra";
import yargs from "yargs";
import {
  lstatSync as lstat,
  readdirSync as readDir,
  readFileSync as readFile
} from "fs";

// using `require` because everything in scripts uses typescript's default
// compiler settings, and these modules require enabling `esModuleInterop`
const npmValiddate = require("validate-npm-package-name");
const userName = require("git-user-name");
const camelCase = require("camelcase");
const prettier = require("prettier");
const chalk = require("chalk");

const COMMAND_NAME = "create";

const getArgv = () => {
  const npmConfigArgv = process.env["npm_config_argv"];
  if (npmConfigArgv) {
    // handle `npm run create name --location chains`
    // convert original npm args into a command
    // create <name> --location <location> [--folder <folder>]
    return JSON.parse(npmConfigArgv).original.slice(1);
  } else {
    // handle `ts-node ./scripts/create.ts name --location chains`

    const args = [...process.argv].slice(2);
    args.unshift(COMMAND_NAME);
    return args;
  }
};

const isDir = (s: string) => lstat(s).isDirectory();
const getDirectories = (s: string) => readDir(s).filter(n => isDir(join(s, n)));
const nameIncludesScope = (s: string) => s.indexOf("@") === 0;

const COLORS = {
  Bold: "\x1b[1m",
  Reset: "\x1b[0m",
  FgRed: "\x1b[31m"
};

let locations = getDirectories(join(__dirname, "../src"));
const chainLocations = getDirectories(join(__dirname, "../src/chains")).map(
  d => `chains/${d}`
);
locations = locations.concat(chainLocations);

const argv = yargs(getArgv())
  .command(`${COMMAND_NAME} <name>`, "", yargs => {
    return yargs
      .usage(
        chalk`{hex("${TruffleColors.porsche}").bold Create a new package in the given {dim <}location{dim >} with the provided {dim <}name{dim >}.}\n\n` +
        chalk`{bold Usage}\n  {bold $} ${COMMAND_NAME} {dim <}name{dim >} {dim --}location {dim <}location{dim >} {dim [--folder <folder>]}`
      )
      .positional("name", {
        // the spaces here are a hack to make this command description line up with the others in the help output
        describe: `          The name for the new package.`,
        type: "string",
        demandOption: true
      })
      .option("location", {
        alias: "l",
        describe: `The location for the new package.`,
        choices: locations,
        demandOption: true
      })
      .option("folder", {
        alias: "f",
        describe: chalk`Optional override for the folder name for the package instead of using {dim <}name{dim >}.`,
        type: "string"
      });
  })
  .demandCommand()
  .version(false)
  .help(false)
  .updateStrings({
    // a little hack just to join the "Positionals" section with the "Options" section, for brevity
    "Positionals:": chalk.bold("Options"),
    "Options:": ` `,
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
  const { name, location } = argv;
  const folderName = argv.folder || name;

  const nameValidation = npmValiddate(name);
  if (!nameValidation.validForNewPackages) {
    throw new Error(
      `the name "${name}" is not a valid npm package name:\n${nameValidation.errors}`
    );
  } else if (nameIncludesScope(name)) {
    throw new Error(
      `the name "${name}" is not a valid ganache package name:\nDo not include scope in name`
    );
  }

  // determines how many `../` are needed for package contents
  const numDirectoriesAwayFromSrc = 1 + location.split(sep).length;
  const relativePathToSrc = "../".repeat(numDirectoriesAwayFromSrc);
  const isNewChain = location === "chains";

  const workspaceDir = join(__dirname, "../");
  const dir = join(workspaceDir, "src", location, folderName);

  if (isNewChain) {
    mkdirSync(dir);

    const fullLocation = join(location, folderName);
    console.log(
      chalk`{green success} {magenta create} New chain folder {bgBlack  ${name} } created at ./src/${fullLocation}.`
    );
    console.log("");
    console.log(
      chalk`  Add packages to this chain by running: {bgBlack {bold npm run create {dim <}name{dim >} {dim --}location ${fullLocation}}}`
    );
    return;
  }
  try {
    const LICENSE = readFile(join(workspaceDir, "LICENSE"), "utf-8");

    const prettierConfig = await prettier.resolveConfig(process.cwd());

    const packageName = `@ganache/${name}`;
    let packageAuthor = userName();
    const version = "0.1.0";

    const rootPackageJson = require("../package.json");

    const pkg = {
      name: packageName,
      publishConfig: {
        access: "public"
      },
      version,
      description: "",
      author: packageAuthor || rootPackageJson.author,
      homepage: `https://github.com/trufflesuite/ganache/tree/develop/src/${location}/${folderName}#readme`,
      license: "MIT",
      main: "lib/index.js",
      typings: "typings",
      source: "index.ts",
      directories: {
        lib: "lib",
        test: "tests"
      },
      files: ["lib", "typings"],
      repository: {
        type: "git",
        url: "https://github.com/trufflesuite/ganache.git",
        directory: `src/${location}/${folderName}`
      },
      scripts: {
        tsc: "tsc --build",
        test: "nyc npm run mocha",
        mocha:
          "cross-env TS_NODE_FILES=true mocha --exit --check-leaks --throw-deprecation --trace-warnings --require ts-node/register 'tests/**/*.test.ts'"
      },
      bugs: {
        url: "https://github.com/trufflesuite/ganache/issues"
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
      ],
      devDependencies: {
        "@types/mocha": rootPackageJson.devDependencies["@types/mocha"],
        "cross-env": rootPackageJson.devDependencies["cross-env"],
        mocha: rootPackageJson.devDependencies["mocha"],
        nyc: rootPackageJson.devDependencies["nyc"],
        "ts-node": rootPackageJson.devDependencies["ts-node"],
        typescript: rootPackageJson.devDependencies["typescript"]
      }
    };

    const tsConfig = {
      extends: `${relativePathToSrc}tsconfig-base.json`,
      compilerOptions: {
        outDir: "lib",
        declarationDir: "typings"
      },
      include: ["src", "index.ts"]
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

    const tests = join(dir, "tests");
    const src = join(dir, "src");

    //@ts-ignore
    function initSrc() {
      return writeFile(
        join(src, "index.ts"),
        prettier.format(indexFile, {
          ...prettierConfig,
          parser: "typescript"
        })
      );
    }

    //@ts-ignore
    function initIndex() {
      // When a bundler compiles our libs this headerdoc comment will cause that
      // tool to retain our LICENSE information in their bundled output.
      const headerdoc = `/*!
  * ${packageName}
  *
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

    //@ts-ignore
    function initRootFiles() {
      return Promise.all([
        writeFile(
          join(dir, ".npmignore"),
          `/index.ts
/tests
/.nyc_output
/coverage
/scripts
/src
/tsconfig.json
/typedoc.json
`
        ),
        writeFile(join(dir, "LICENSE"), LICENSE)
      ]);
    }

    //@ts-ignore
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
          attr: chalk.hex(TruffleColors.turquoise),
          string: chalk.hex(TruffleColors.porsche)
        }
      })
    );

    console.log(
      chalk`{green success} {magenta create} New package {bgBlack  ${name} } created at .${sep}${join(
        "src",
        location,
        folderName
      )}.`
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
