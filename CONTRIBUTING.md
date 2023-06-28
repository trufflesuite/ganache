# Contributing to Ganache

## Getting set up

- Use Node.js v16.0.0.
  - Why v16.0.0? Because this is the first LTS release of Node.js v16 and is the earliest version Ganache supports.
  - recommendation: use [nvm](https://github.com/nvm-sh/nvm) on Linux and macOS, and [nvm-windows](https://github.com/coreybutler/nvm-windows) on
    Windows, to configure your node version.
    - On Linux and macOS, if you have `nvm` installed, just run `nvm use` to switch to Node.js v16.0.0.
- `git clone git@github.com:trufflesuite/ganache.git`
- `cd ganache`
- `npm install` (use npm v7)

## Solving node-gyp issues

If installation fails due to a `node-gyp` issue you may need to perform some additional system configuration.

note: Ganache uses [node-gyp v7.1.2](https://github.com/nodejs/node-gyp/tree/v7.1.2) as part of its build system, which requires Python v2.7, v3.5, v3.6, v3.7, or v3.8 to be installed on the system.

### on Windows

- Install [https://www.npmjs.com/package/windows-build-tools](Windows-Build-Tools)
  - `npm install --global windows-build-tools`

### on Linux (Ubuntu-based)

- Make sure `npm` commands are not run as `root`.
- If you get an error that `make` isn't installed you might need to also install the `build-essential` package
 - example `sudo apt update && sudo apt install build-essential`
- Determine whether you have a compatible version of Python installed:
  - example: `python --version` (and `python3 --version` if `python3` is installed)
- If you do not have a compatible version installed: (v2.7, v3.5, v3.6, v3.7, or v3.8), you will need to install it:
  - example: `sudo apt update && sudo apt install python2.7`
- You may need to configure the python dependency (see [node-gyp for details on different ways to do this](https://github.com/nodejs/node-gyp/tree/v7.1.2#configuring-python-dependency)):
  - example: `npm config set python <path-to-python-executable>`

### on macOS

- Attempt to install Xcode command line tools (the console will tell you if they're already installed)
  - example: `xcode-select --install`
- Determine whether you have a compatible version of Python installed:
  - example: `python --version` (and `python3 --version` if `python3` is installed)
- If you do not have a compatible version installed: (v2.7, v3.5, v3.6, v3.7, or v3.8), you will need to install it: (we recommend [pyenv](https://github.com/pyenv/pyenv) to manage your python installation)
  1. [Install `pyenv`](https://github.com/pyenv/pyenv#homebrew-in-macos)
  2. [Setup your shell environment for `pyenv`](https://github.com/pyenv/pyenv#set-up-your-shell-environment-for-pyenv)
  3. Install Python: `pyenv install 2.7`
  4. You may need to configure the python dependency (see [node-gyp for details on different ways to do this](https://github.com/nodejs/node-gyp/tree/v7.1.2#configuring-python-dependency)):
  - example: `npm config set python <path-to-python-executable>`
- If the above steps don't fix the `node-gyp` issue and you've recently updated your OS, you may need to re-install Xcode command line tools:
  1. Remove the existing, broken installation: `rm -rf /Library/Developer/CommandLineTools`
  2. Install them again: `xcode-select --install`

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

## To create a new package

- `npm run create <name> --location <location> [--folder <folder>]`

This will create a new package with Ganache defaults at `<location>/<name>`.

If you provide the optional `--folder` option, the package will be created at `<location>/<folder>`.

## To add a module to a package:

- `npx lerna add <module>[@version] -E [--dev] [--peer] --scope=<package>`

Where `<module>` is the npm-module you want to add and `<package>` is where you want to add it. See
[@lerna/add documentation](https://github.com/lerna/lerna/tree/master/commands/add) for more details.

Example:

```bash
npx lerna add @ganache/options -E --scope=@ganache/ethereum
```

will add our local `@ganache/options` package to the `@ganache/ethereum` package.

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
-        "${workspaceFolder}/packages/**/tests/**/*.test.ts"
+        "${workspaceFolder}/packages/ethereum/ethereum/tests/**/*.test.ts"
       ],
       "skipFiles": ["<node_internals>/**"],
       "console": "integratedTerminal",
```

## Code Conventions

These are guidelines, not rules. :-)

- Use Node.js v16.0.0 for most local development.
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

The PR title and "Squash and Merge" commit message _must_ be in the [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) format. The [semantic-prs](https://github.com/Ezard/semantic-prs#readme) Github app is enabled for the repo and configured to require a PR title in the conventional commit format. When you "Squash and Merge", the commit message will automatically pull from the PR title, so just don't change this and there shouldn't be any issues. The conventional commit format is as follows:

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

Notice how the description is in lowercase (except for initialisms/acronyms). The description should be clear and concise. The subject line does _not_ have to be fewer than 50 characters if making it shorter removes useful information.

Co-authors should be preserved.

This format is what drives our automated release process and helps makes releases go smoothly.
