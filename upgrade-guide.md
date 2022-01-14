# Ganache Upgrade Guide

## ganache-core v2.x.x and ganache-cli v6.x.x to ganache v7.x.x

### Installing

The Ganache npm packages have been combined and renamed from `ganache-cli` and
`ganache-core` to `ganache`. You will need to uninstall these packages before
installing the new ganache.

There are two ways you may have the old packages installed, globally or locally.
The uninstall and installation process are slightly different for each.

#### Globally installed

A global installation makes it possible to run Ganache from your command line at
any working directory: `$~ ganache [...options]`.

To upgrade a global installation using [`npm`](____) run these two commands:

```console
$ npm uninstall --global ganache-cli ganache-core
$ npm install --global ganache
```

_For security reasons[1] we do not recommend using yarn or pnpm as your package
manager when installing security-critical applications like Ganache._

You will now be able to run `$~ ganache` from your command line.

_note: you may need to uninstall using yarn, or another node package manager,
depending on how you originally installed ganache-cli or ganache-core._

#### Locally installed

A local installation makes it possible to `import` or `require` Ganache from 
programmatically from JavaScript or TypeScript. Additionally, you can run the
command line version of Ganache from your [package.json scripts] or directly
from the command line using `npx ganache` ([what is npx?](______)).

To upgrade a local installation using [`npm`](____) run these two commands:

```console
$ npm uninstall ganache-cli ganache-core
$ npm install --save-dev ganache
```

_For security reasons[1] we do not recommend using yarn or pnpm as your package
manager when installing security-critical applications like Ganache._

You will now be able to run Ganache programmatically from within your JavaScript
or TypeScript files.

An example diff might look like:

```diff
diff --git a/index.js b/index.js
index abcdefg..hijklmn 123456
--- a/index.js
+++ b/index.js
@@ -0,7 +0,7 @@
 const Web3 = require("web3");
 const debug = require("debug");
 const helpers = require("./helpers");
-const ganache = require("ganache-core");
+const ganache = require("ganache");
 const provider = ganache.provider();
 const web3 = new Web3(provider);

```

Or in other words:

```javascript
// const ganache = require("ganache-core"); // <- replace this line with
const ganache = require("ganache");
```

If you `require` or `import` the `ganache-cli` package instead of ganache-core
the replacement is exactly the same:

```javascript
// const ganache = require("ganache-cli"); // <- replace this line with
const ganache = require("ganache");
```

_note: you may need to uninstall using yarn, or another node package manager,
depending on how you originally installed ganache-cli or ganache-core._

### Breaking changes

#### Allowed transaction signature changes

Previously, Ganache allowed transaction signatures to original from 3 chains
 ids: `1`, `chainId`, and `networkId`. Ganache now permits only the `chainId`.

#### `_chainId` and `_chainIdRpc` options removed

TODO: verify chainId option names

If you relied on the EVM's `CHAINID` opcode and the RPC method for `eth_chainId`
to return different values you'll need to fix your code so that it only uses one
of these values.

The `_chainId` and `_chainIdRpc` options were a workaround for a legacy bug. We
have not carried over this bug into Ganache v7. Use the `chainId` option from
now on.

#### `vmErrorsOnRPCResponse` now defaults to `false`

The `vmErrorsOnRPCResponse` option caused Ganache to return an error for
transactions that error or revert during EVM execution. 

On the command line this option was called `noVmErrorsOnRPCResponse`, and the
default was `false`. Programmatically this option was `vmErrorsOnRPCResponse` and
it defaulted to `true`.

Ganache now _disables_ `vmErrorsOnRPCResponse` by default.

If you rely on tranasction


1 yarn and pnpm doesn't support dependency lock files, like npm's npm-shrinkwrap.json,
which permits supply-chain attacks through automatic transitive dependency
updates, like the [uWs attack](), the [left-pad attack](), mostly recently the
[colors and ____ attack]().