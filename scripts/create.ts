import {mkdir, mkdirSync, writeFile} from "fs-extra";
import yargs from "yargs";
import {join, resolve} from "path";
import prettier from "prettier";
import {version} from "../lerna.json";

const COLORS = {
  FgGreen: "\x1b[32m",
  Reset: "\x1b[0m",
  FgRed: "\x1b[31m",
  FgMagenta: "\x1b[35m"
};

const argv = yargs.command("$0 <name>", "Package Name").demandCommand().help().argv;

(async function () {
  const prettierConfig = await prettier.resolveConfig(process.cwd());
  const name = argv.name as string;

  const pkg = {
    name: name,
    version: version,
    homepage: "https://github.com/trufflesuite/ganache-core#readme",
    license: "MIT",
    main: "lib/index.js",
    typings: "lib/index.d.ts",
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
      tsc: "ts-node ../../compile",
      test: "nyc npm run mocha -- --throw-deprecation --trace-warnings",
      mocha:
        "cross-env TS_NODE_FILES=true mocha --require ts-node/register --require source-map-support/register --recursive --check-leaks '__tests__/**.ts'"
    },
    bugs: {
      url: "https://github.com/trufflesuite/ganache-core/issues"
    }
  };

  const shrinkwrap = {
    name: name,
    version: version,
    lockfileVersion: 1
  };

  const testFile = `import assert from "assert";

describe("@ganache/${name}", () => {
  it("needs tests", async () => {
    assert.fail(\`TODO: write tests for package "${name.replace(/`/g, "-")}".\`);
  });
})`;

  const indexFile = `export default {
  // TODO
}
`;

  const dir = join("./packages", name);
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

  try {
    mkdirSync(dir);

    await Promise.all([
      mkdir(tests).then(initTests),
      mkdir(src).then(initSrc),
      writeFile(
        join(dir, "README.md"),
        prettier.format(`# ${name}\n> TODO: description`, {...prettierConfig, parser: "markdown"})
      ),
      writeFile(pkgPath, pkgStr),
      writeFile(join(dir, "npm-shrinkwrap.json"), JSON.stringify(shrinkwrap) + "\n")
    ]);

    console.log(pkgStr);

    console.log(
      `${COLORS.FgGreen}success${COLORS.Reset} ${COLORS.FgMagenta}create${COLORS.Reset} New package ${name} created at ./packages/${name}`
    );
  } catch (e) {
    console.error(e);
    console.log("");
    console.log(
      `${COLORS.FgRed}fail${COLORS.Reset} ${COLORS.FgMagenta}create${COLORS.Reset} New package ${name} not created. See error above. `
    );
  }
})();
