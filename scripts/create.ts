import {mkdir, mkdirSync, writeFile} from "fs-extra";
import yargs from "yargs";
import {join, resolve} from "path";
import prettier from "prettier";
import {version} from "../lerna.json";
import camelCase from "camelcase";
import npa from "npm-package-arg";

const COLORS = {
  FgGreen: "\x1b[32m",
  Reset: "\x1b[0m",
  FgRed: "\x1b[31m",
  FgMagenta: "\x1b[35m",
  BgBlack: "\x1b[40m"
};

const argv = yargs.command("$0 <name>", "Package Name").demandCommand().help().argv;

(async function () {
  let name = argv.name as string;
  try {
    const prettierConfig = await prettier.resolveConfig(process.cwd());
    name = npa(argv.name as string).name;

    const packageName = `@ganache/${name}`;

    const pkg = {
      name: packageName,
      version: version,
      homepage: "https://github.com/trufflesuite/ganache-core#readme",
      license: "MIT",
      main: "src/index.ts",
      typings: "src/index.ts",
      directories: {
        lib: "lib",
        test: "__tests__"
      },
      files: ["lib"],
      repository: {
        type: "git",
        url: "git+https://github.com/trufflesuite/ganache-core.git"
      },
      scripts: {
        tsc: "ts-node ../../../scripts/compile",
        test: "nyc npm run mocha -- --throw-deprecation --trace-warnings",
        mocha: "mocha --detectLeaks '__tests__/**.ts'"
      },
      bugs: {
        url: "https://github.com/trufflesuite/ganache-core/issues"
      }
    };

    const tsConfig = {
      extends: "../../../tsconfig.json",
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

    const dir = join("./src/packages", name);
    const tests = join(dir, "__tests__");
    const src = join(dir, "src");

    function initSrc() {
      return writeFile(join(src, "index.ts"), prettier.format(indexFile, {...prettierConfig, parser: "typescript"}));
    }

    function initTests() {
      return writeFile(
        join(tests, "index.test.ts"),
        prettier.format(testFile, {...prettierConfig, parser: "typescript"})
      );
    }

    const pkgStr = JSON.stringify(pkg, null, 2) + "\n";
    const pkgPath = join(dir, "package.json");

    console.log(`About to write to ${resolve(__dirname, pkgPath)}`);
    console.log("");

    mkdirSync(dir);

    await Promise.all([
      mkdir(tests).then(initTests),
      mkdir(src).then(initSrc),
      writeFile(
        join(dir, "tsconfig.json"),
        JSON.stringify(tsConfig, null, 2) + "\n"
      ),
      writeFile(
        join(dir, "README.md"),
        prettier.format(`# ${packageName}\n> TODO: description`, {...prettierConfig, parser: "markdown"})
      ),
      writeFile(pkgPath, pkgStr),
      writeFile(join(dir, "npm-shrinkwrap.json"), JSON.stringify(shrinkwrap) + "\n")
    ]);

    console.log(pkgStr);

    console.log(
      `${COLORS.FgGreen}success${COLORS.Reset} ${COLORS.FgMagenta}create${COLORS.Reset} New package ${COLORS.BgBlack}${name}${COLORS.Reset} created at ./packages/${name}.`
    );
  } catch (e) {
    console.error(e);
    console.log("");
    console.log(
      `${COLORS.FgRed}fail${COLORS.Reset} ${COLORS.FgMagenta}create${COLORS.Reset} New package ${COLORS.BgBlack}${name}${COLORS.Reset} not created. See error above.`
    );
  }
})();
