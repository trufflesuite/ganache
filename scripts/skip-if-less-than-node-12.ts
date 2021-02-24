// To use this script, run `ts-node path/to/skip-if-less-than-node-12.ts || <command>`
// This script will "succeed" if less than node@12, causing <command> to not execute
// but also make look like the overall command was successful

const majorVersionStringMatch = /^v([0-9]+)\./.exec(process.version);

if (!majorVersionStringMatch || majorVersionStringMatch.length < 2) {
  console.error(
    "ERROR: Could not parse process.version for some reason. This shouldn't happen."
  );
  process.exit(0); // we exit with code 0 to prevent further scripts from running
}

const majorVersion = parseInt(majorVersionStringMatch[1], 10);

if (majorVersion < 12) {
  console.log(
    `Skipping following command as the NodeJS version is ${majorVersion}, and it needs to be at least 12 to continue.`
  );
  process.exit(0);
} else {
  process.exit(1);
}
