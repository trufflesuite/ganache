import { join } from "path";
import { cwd } from "process";
const semver = require("semver");

// To use this script, run `ts-node path/to/require-engines.ts || <command>`
// This script will "succeed" if greater than node@16, causing <command> to not execute
// but also make look like the overall command was successful

const pkg = require(join(cwd(), "package.json"));
if (pkg.engines && pkg.engines.node) {
  if (
    semver.satisfies(semver.coerce(process.version).version, pkg.engines.node)
  ) {
    process.exit(1);
  } else {
    console.log(
      `Skipping following command as the Node.js version is "${process.version}", and it requires "${pkg.engines.node}" to continue.`
    );
    process.exit(0);
  }
}
