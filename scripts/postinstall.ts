// using `require` because everything in scripts uses typescript's default
// compiler settings, and this module requires enabling `esModuleInterop`
const chalk = require("chalk");
import { execSync, ExecSyncOptions } from "child_process";

const cwd = process.cwd();
const execArgs: ExecSyncOptions = { cwd, stdio: "inherit" };

// run `lerna bootstrap`
let lernaUseCi: boolean = false;
if (process.env.npm_config_argv) {
  let npmArgs: { cooked?: string[] };
  try {
    npmArgs = JSON.parse(process.env.npm_config_argv);
  } catch {}
  if (
    npmArgs != null &&
    Array.isArray(npmArgs.cooked) &&
    npmArgs.cooked.length > 0
  ) {
    lernaUseCi = npmArgs.cooked.includes("ci");
  }
}

execSync(`$(npm bin)/lerna bootstrap --ci=${lernaUseCi}`, execArgs);

// lerna breaks yarn.lock/package-lock.json/npm-shrnikwrap.json files
// by omitting our internal packages from them. We can fix this by
// running `npm i --only-package-lock` in each package
if (!lernaUseCi) {
  execSync(`$(npm bin)/lerna exec --concurrency 1 -- npm shrinkwrap`, execArgs);
}

// update typescript project references
require("./link-ts-references");

execSync("npm run tsc", execArgs);

console.log("");
console.log(
  chalk`{bold.cyan Tip:} {cyan run} {bold.yellow.dim source completions.sh} {cyan to supply bash completions for npm scripts}`
);
console.log("");
