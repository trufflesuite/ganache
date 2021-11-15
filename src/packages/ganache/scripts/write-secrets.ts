import { writeFileSync } from "fs-extra";
import { join } from "path";

// This file updates the embedded infura credentials. It is intended to be used
// at build time via the release process GitHub Action.

function write() {
  const path = join(
    __dirname,
    "../../../chains/ethereum/ethereum/src/forking/infura-credentials.ts"
  );
  writeFileSync(
    path,
    `
export const INFURA_KEY = ${JSON.stringify(process.env.INFURA_KEY)};
  `.trim()
  );
}

if (
  !process.env.INFURA_KEY &&
  process.env.CREATE_BROKEN_BUILD !== "I WILL NOT PUBLISH THIS"
) {
  throw new Error(
    '`INFURA_KEY` environment variable was not supplied at build time. To bypass this check set the environment variable `CREATE_BROKEN_BUILD` to `"I WILL NOT PUBLISH THIS"`.'
  );
} else {
  write();
}
