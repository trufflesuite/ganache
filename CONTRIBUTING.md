# Contributing to Ganache

## Getting set up

- Use Node.js v12.0.0.
  - Why v12.0.0? Because this is the first LTS release of Node.js v12 and is the earliest version Ganache supports.
  - recommendation: use [nvm](https://github.com/nvm-sh/nvm) on Linux and macOS, and [nvm-windows](https://github.com/coreybutler/nvm-windows) on
    Windows, to configure your node version.
    - On Linux and macOS, if you have `nvm` installed, just run `nvm use` to switch to Node.js v12.0.0.
- `git clone git@github.com:trufflesuite/ganache.git`
- `cd ganache`
- `npm install` (use npm v6)
- On Linux and macOS: run `source completions.sh` to enable autocomplete for npm scripts.

## Solving node-gyp issues

If installation fails due to a `node-gyp` issue you may need to perform some additional system configuration.

### on Linux (Ubuntu-based)

- Determine if you have Python 2.7 installed
  - example: `which python2.7`
- If you do not have Python 2.7 installed, you need to install it
  - example: `sudo apt update && sudo apt install python2.7`
- Finally, run `npm config set python python2.7`

### on Windows

- Install [https://www.npmjs.com/package/windows-build-tools](Windows-Build-Tools)
  - `npm install --global windows-build-tools`

### on macOS

- I have no idea.

## Clean install

- `npm run reinstall`

Which just runs these commands for you:

- `npm run clean`
- `npm install`

This deletes all `node_modules` folders, as well as all generated `lib`
directories, then reinstalls all modules.

## To compile

Compiles the `ganache` package and its internal dependencies and subdependencies:

- `npm run tsc`

To compile a package directly:

- `npx lerna run --scope @ganache/<name> tsc`

This can be useful if the package isn't yet in ganache's dependency tree.

## To build the ganache package

Creates the bundle that can be published to npm

- `npm run build`

## To test

Runs all tests:

- `npm test` (or the shorthand, `npm t`)

## To start cli

To start the cli run:

- `npm start`

To pass options to the cli you must separate the args with `--`, e.g.:

- `npm start -- --chain.chainId 1 --wallet.totalAccounts 5`

## To create a new chain/flavor

- `npm run create <name> --location chains`

This will create a new folder at `src/chains/<name>` where `<name>` should be the flavor name (e.g. `ethereum`), which
you then can [create packages under](#to-create-a-new-package).

## To create a new package

- `npm run create <name> --location <location> [--folder <folder>]`

This will create a new package with Ganache defaults at `src/<location>/<name>`.

If you provide the optional `--folder` option, the package will be created at `src/<location>/<folder>`.

## To add a module to a package:

- `npx lerna add <module>[@version] -E [--dev] [--peer] --scope=<package>`

Where `<module>` is the npm-module you want to add and `<package>` is where you want to add it. See
[@lerna/add documentation](https://github.com/lerna/lerna/tree/master/commands/add) for more details.

Example:

```bash
npx lerna add @ganache/options -E --scope=@ganache/filecoin
```

will add our local `@ganache/options` package to the `@ganache/filecoin` package.

## To remove a module from another package:

`cd` to the package and then run `npm uninstall <module>`

## Editor Integrations

### Automated Code Formatting

- See: https://prettier.io/docs/en/editors.html

### VSCode On Windows (10)

- Enable "Developer Mode" by going to Settings -> Developer Settings -> Then select Developer Mode.

### To debug tests in VS Code

- Copy the [`launch.json`](./docs/assets/launch.json) file into a folder named `.vscode` in root of the project.
- Set breakpoints by clicking the margin to the left of the line numbers (you can set conditional breakpoints or
  logpoints by right-clicking instead)
- Press <kbd>F5</kbd> (or select `Run` 🡺 `Start Debugging` from the menu bar) to automatically start debugging.

To change which files are debugged update your `.vscode/launch.json` file glob to match your target files. Here is an
example to debug only test files in the `@ganache/ethereum` package:

```diff
diff --git a/.vscode/launch.json b/.vscode/launch.json
index 2a2aa9e..57cbf21 100644
--- a/.vscode/launch.json
+++ b/.vscode/launch.json
@@ -24,7 +24,7 @@
         "--colors",
         "--require",
         "ts-node/register",
-        "${workspaceFolder}/src/**/tests/**/*.test.ts"
+        "${workspaceFolder}/src/chains/ethereum/ethereum/tests/**/*.test.ts"
       ],
       "skipFiles": ["<node_internals>/**"],
       "console": "integratedTerminal",
```

## Code Conventions

These are guidelines, not rules. :-)

- Use Node.js v12.0.0 for most local development.
- Use `bigint` literals, e.g., `123n`; if the number is externally configurable and/or could exceed
  `Number.MAX_SAFE_INTEGER`.
- Write tests.
- Do not use "Optional Chaining" (`obj?.prop`). I'd love to enable this, but TypeScript makes it hard to use bigint
  literals and optional chaining together. If you figure it out, delete this rule!
- Prefer using a single loop to functional chaining.
- Prefer performant code over your own developer experience.
- Document complex code. Explain why the code does what it does.
- Feel free to be clever, just document _why_ you're being clever. If it's hard to read, comment _what_ the code does,
  too.
- Add JSDoc comments to public class members where it makes sense.
- Before adding an external dependency check its code for quality, its # of external dependencies, its node version
  support, and make sure it's absolutely necessary.
- Pin all dependencies, even dev dependencies.
- Use npm; do not use yarn.
- Don't use web3, ethers, etc in ganache core code. (Tests are fine)
- Ensure a smooth development experience on Windows, Mac, and Linux.
- Do not use bash scripts for critical development or configuration.
- Do not use CLI commands in npm scripts or build scripts that aren't available by default on supported platforms.
- Push your code often (at least every-other day!), even broken WIP code (to your own branch, of course).

## Pull Requests

This section is mostly for the maintainers of Ganache, not individual contributors. You may commit with any messages you
find useful.

We _always_ "Squash and Merge" Pull Requests into a single commit message when merging into the `develop` branch.

The "Squash and Merge" commit message _must_ be in the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) format:

```
<type>[optional scope]: <description> (#PR Number)

[optional body]

[optional footer(s)]
```

Example:

```
fix: reduce bundle size and check size in CI (#1234)

Co-authored-by: TinusLorvalds <lorvalds@finux-loundation.org>
```

Notice how the description is in lowercase (except for initialisms/acronyms). The description should be clear and consise. The subject line does _not_ have to be fewer than 50 characters if making it shorter removes useful information.

Co-authors should be preserved.

This format is what drives our automated release process and helps makes releases go smoothly.
