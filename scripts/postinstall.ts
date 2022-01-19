// using `require` because everything in scripts uses typescript's default
// compiler settings, and this module requires enabling `esModuleInterop`
const chalk = require("chalk");
import { execSync, ExecSyncOptions } from "child_process";

const cwd = process.cwd();
const execArgs: ExecSyncOptions = { cwd, stdio: "inherit" };

// run `lerna bootstrap`
let lernaUseCi: boolean = false;
if (process.env.npm_config_argv) {
  let npmArgs: { cooked?: string[] } | null = null;
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

execSync(`npx --no-install lerna bootstrap --ci=${lernaUseCi}`, execArgs);

// update typescript project references
require("./link-ts-references");

execSync("npm run tsc", execArgs);

console.log("");
console.log(
  chalk`{bold.cyan Tip:} {cyan run} {bold.yellow.dim source completions.sh} {cyan to supply bash completions for npm scripts}`
);
console.log("");
