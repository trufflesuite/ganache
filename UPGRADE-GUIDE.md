# Ganache Upgrade Guide

## ganache-core v2.x.x and ganache-cli v6.x.x to ganache v7.x.x

### Installing

The Ganache npm packages have been combined and renamed from `ganache-cli` and
`ganache-core` to `ganache`. You may need to uninstall the old packages before
installing the new ganache.

There are two ways you may have the old packages installed, globally or locally.
The uninstall and installation process are slightly different for each.

#### Globally installed

A global installation makes it possible to run Ganache from your command line at
any working directory: `ganache [...options]`.

To upgrade a global installation using `npm` run these two commands:

```console
$ npm uninstall --global ganache-cli ganache-core
$ npm install --global ganache
```

_For security reasons[^1] we do not recommend using yarn or pnpm as your package
manager when installing security-critical applications like Ganache._

You will now be able to run `ganache` from your command line.

_NOTE: you may need to uninstall using yarn, or another node package manager,
depending on how you originally installed ganache-cli or ganache-core._

#### Locally installed

A local installation makes it possible to `import` or `require` Ganache  
programmatically from JavaScript or TypeScript. Additionally, you can run the
command line version of Ganache from your [package.json scripts](https://docs.npmjs.com/cli/v8/using-npm/scripts) or directly
from the command line using `npx ganache` ([what is npx?](https://www.npmjs.com/package/npx)).

To upgrade a local installation using `npm` run these two commands:

```console
$ npm uninstall ganache-cli ganache-core
$ npm install --save-dev ganache
```

_For security reasons[^1] we do not recommend using yarn or pnpm as your package
manager when installing security-critical applications like Ganache._

You will now be able to run Ganache programmatically from within your JavaScript
or TypeScript files.

Or in other words:

```javascript
// const ganache = require("ganache-core"); // <- replace this line with
const ganache = require("ganache");
```

If you `require` or `import` the `ganache-cli` package instead of ganache-core,
the replacement is exactly the same:

```javascript
// const ganache = require("ganache-cli"); // <- replace this line with
const ganache = require("ganache");
```

You can also run Ganache directly from your package.json scripts:

```json
{
  "scripts": {
    "start-ganache": "ganache"
  }
}
```

_NOTE: we've aliased ganache-cli to ganache, so you can continue using the
ganache-cli command in your npm scripts and in your terminal._

_NOTE: you may need to uninstall using yarn, or another node package manager,
depending on how you originally installed ganache-cli or ganache-core._

---

### Breaking changes

#### Allowed transaction signature changes

Previously, Ganache allowed transaction signatures to originate from 3 chains
 ids: `1`, `chainId`, and `networkId`. Ganache now allows only transactions
 signed with its own `chainId`.

#### `_chainId` and `_chainIdRpc` options removed

If you relied on the EVM's `CHAINID` opcode and the RPC method for `eth_chainId`
to return different values you'll need to update your code so that it uses the
actual chain id only, as these values are now properly aligned.

The `_chainId` and `_chainIdRpc` options were a workaround for a legacy bug. We
have not carried over this bug into Ganache v7. Use the `chainId` option from
now on.

#### `vmErrorsOnRPCResponse` now defaults to `false`

The `vmErrorsOnRPCResponse` option caused Ganache to return an error for
transactions that error or revert during EVM execution.

On the command line this option was called `noVmErrorsOnRPCResponse`, and the
default was `false`. In programmatic use this option was `vmErrorsOnRPCResponse`
and it defaulted to `true`.

Ganache now _disables_ the `vmErrorsOnRPCResponse` functionality by default.

If your code relies on these non-standard errors on transaction failure, you'll 
need to _enable_ the `vmErrorsOnRpcResponse` flag to restore this behavior:

```console
$ ganache --vmErrorsOnRpcResponse
```

or programmatically:

```javascript
ganache.provider({
  vmErrorsOnRpcResponse: true
});
```

If you want to use the new default mode but still be able to get the reason for
a transaction failure, you need to resend your transaction with an `eth_call`.
This will return the revert reason in nearly all cases[^2].

#### Dropped support for Node v8 and v10

We no longer support Node v8 - v11. You'll need to update to Node v12.0.0 or
later. NOTE: Support for Node.js v12.x.x will be dropped shortly after the
Node.js Foundation stops supporting it in April 2022.

#### DockerHub repo has been moved to trufflesuite/ganache

You may want to remove your old Docker images and containers and then pull
Ganache from the new location before updating, but this step is not required.

> Note: Before updating you may want to prune your Docker images and containers.
 Read more on [docker pruning](https://docs.docker.com/config/pruning/).

You can view the list of local Docker containers by running:

```console
$ docker container ls
```

and [remove a container](https://docs.docker.com/engine/reference/commandline/container_rm/) using

```console
$ docker container rm <CONTAINER ID>
```

You can view the list of local Docker images by running:

```console
$ docker image ls
```

and [remove an image](https://docs.docker.com/engine/reference/commandline/image_rm/)
using

```console
$ docker image rm <IMAGE ID>
```

To install the Ganache v7 Docker container run:

```console
$ docker pull trufflesuite/ganache:latest
```

or to pull and run it simultaneously:

```console
$ docker run --port 8545:8545 trufflesuite/ganache:latest
```


#### Default startup ether is now 1000 instead of 100

We polled 50 developers about Ganache's startup Ether amount. 44% had no
opinion, 33% didn't need more, and 22% said they change the default amount to
1000 or more. While the 22% is a minority, we felt that it was a large enough
percentage to warrant the change.

If you relied on this value and don't want to update your code you can set the
start up amount back to 100 ether:

on the command line:

```console
$ ganache --wallet.defaultBalance 100
```

or programmatically:

```javascript
ganache.provider({
  wallet: {
    defaultBalance: 100
  }
})
```

#### Ganache's provider and server interfaces have changed

Ganache's provider and server internals are no longer addressable. This means you
can’t manipulate the vm directly anymore. Open a
[new issue](https://github.com/trufflesuite/ganache/issues/new)
if you relied on these removed internals and need us to build in public and
stable access to them.

If you were previously programmatically accessing the VM step events by
traversing Ganache internals you can now access these via a new Event System:

In addition to [EIP-1193's](https://eips.ethereum.org/EIPS/eip-1193) `"message"`
 event and the legacy `"data"` event, Ganache emits 3 additional events:
 `"ganache:vm:tx:before"`, `"ganache:vm:tx:step"`, and `"ganache:vm:tx:after"`.

These events can be used to observe the lifecycle of any transaction executed
via `*sendTransaction`, `eth_call`, `debug_traceTransaction`, or `debug_storageRangeAt`.

These share the
[event paradigm that Truffle uses](https://www.trufflesuite.com/docs/truffle/advanced/event-system#how-to-define-your-event-handlers),
but without any of the wildcard handling, i.e., no `"vm:*"` support (for now).

Each of these events will emit a `context` object which is a unique object that
can be used to identify a transaction over the course of its lifecycle. For
example:

```typescript
interface StepEvent {
  account: {
    nonce: bigint;
    balance: bigint;
    stateRoot: Buffer;
    codeHash: Buffer;
  };
  address: Buffer;
  codeAddress: Buffer;
  depth: number;
  gasLeft: bigint;
  gasRefund: bigint;
  memory: Buffer;
  memoryWordCount: bigint;
  opcode: {
    name: string;
    fee: number;
  };
  pc: number;
  returnStack: Buffer[];
  stack: Buffer[];
}
const contexts = new Map();
provider.on("ganache:vm:tx:before", (event: { context: {} }) => {
  contexts.set(event.context, []);
});
provider.on("ganache:vm:tx:step", (event: StepEvent) => {
  contexts.get(event.context).push(event.data);
});
provider.on("ganache:vm:tx:after", (event: { context: {} }) => {
  doAThingWithThisTransactionsSteps(contexts.get(event.context));
  contexts.delete(event.context);
});
```

The reason this `context` is necessary is that Ganache may run multiple
transactions simultaneously, so `"ganache:vm:tx:step"` events from different
transactions could be intermingled.

The above events will be emitted for `eth_call`, `*sendTransaction`,
`debug_traceTransaction`, and `debug_storageRangeAt`.

Currently, we do not await the event listener's return value, however, we'll
likely enable this in the future.

#### Old databases from previous versions are not compatible with v7.0.0

Ganache's old database format is incompatible with this version. We've decided
to hold off on building migration tools for this. If you will need a migration
tool (you use the `db` flag or the `db_path` option and are unable to recreate 
your initial DB state) please
[open an issue](https://github.com/trufflesuite/ganache/issues/new)
to let us know.

#### Non-consecutive transaction nonces no longer throw an error

We now support the `pendingTransactions` event and will soon support actual
`pending` blocks.

Previously, if you sent a transaction with a nonce that did not match the
account's transaction count, that transaction would be immediately rejected. In
v7 that transaction will be placed in the node's transaction queue.

You can replace these queued transactions the same way you'd replace the
transaction on Mainnet or tests, by sending another transaction with the same
nonce but a higher gas price.

Currently the eviction mechanism is not tunable beyond the `miner.priceBump` option, but we plan on exposing additional options
to change the behavior in the near future.

NOTE: currently, the number of queued transactions does not have an upper bound
and you can continue adding new transactions until your process runs out of
memory and crashes. We consider this a memory leak and a bug. Expect this
unbounded behavior to change in a patch-level release in the future.

NOTE: if you use the persisted DB option: we have never stored unexecuted
transactions to disk and do not plan to do so. The same is true of these queued
transactions.

#### Non-zero gas prices are not permitted in the london hardfork

A side effect of the updating to the london hardfork is that transactions can no longer be
sent with a `gasPrice` of `0`. The reason for this is that blocks automatically
adjust the minimum gas price from one block to another. We'll be adding a
feature flag to allow for zero `gasPrice` transactions in the future. If you
need zero-gasPrice transactions now you'll have to set the `hardfork`
flag/option to "berlin" or earlier:

```console
$ ganache --hardfork berlin
```

```javascript
ganache.provider({
  hardfork: "berlin"
});
```

#### Legacy transactions sent via `eth_sendTransaction` are automatically upgraded to "Type 2" ([EIP-1559](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1559.md)) transactions.

If you send a transaction with `eth_sendTransaction` and that transaction doesn't have a `gasPrice` field, the transaction will be automatically "upgraded" to a type 2 transaction. Type 2 transactions will have many different fields for an identical legacy transaction sent pre-london.

```typescript
// send a "legacy" transaction
const hash = await provider.request("eth_sendTransaction", [{ from }]); 
const tx = await provider.request("eth_getTransactionByHash", [hash]);
// The returned `type` field indicates it was updated to a type 2 transaction
assert.strictEqual(tx.type, "0x2");
```

To revert to type "0x0" transactions you'll need to set the hardfork to
"istanbul" or earlier.

On the cli:

```console
$ ganache --hardfork istanbul
```

Programmatically:

```javascript
ganache.provider({
  hardfork: "istanbul"
});
```

... or set an explicit `gasPrice` on your transactions:

```JSON5
{
  "from": "0x...",
  "to": "0x...",
  /* ...etc... */
  "gasPrice": "0x..."
}
```

#### Transactions are now ordered relative to the "current" block's `baseFeePerGas`

Because the gas fee a transaction might pay now depends on the block's
`baseFeePerGas` transactions are re-sorted in the context of each new block.
Transaction ordering is still deterministic
([except in rare cases](https://github.com/trufflesuite/ganache/issues/1104))
but the order now depends on previous blocks.

To revert to the old way or ordering transactions you'll need to set the
hardfork to "berlin" or earlier.

On the cli:

```console
$ ganache --hardfork istanbul
```

Programmatically:

```javascript
ganache.provider({
  hardfork: "istanbul"
});
```

#### We now reject transactions with insufficient funds

The ganache-cli v6 and ganache-core v2 packages used to allow transactions with
a `tx.gasLimit * tx.gasPrice + tx.value < account.balance` into the transaction
pool. Ganache v7 will now immediately reject transactions that meet that
condition with an `"insufficient funds for gas * price + value"` error message
(with a `code` of `-32003`).

You'll need to change your transaction so that the maximum possible gas cost is
less than the sending account's balance, or provide enough funds to the
sending account to cover the maximum cost.

### Other breaking changes that you probably won't notice

- `web3_clientVersion` now returns `Ganache/v{number/number/number}`
- `Runtime Error:` errors are now `Runtime error:`
- change `signer account is locked` error to `authentication needed: passphrase or unlock`
- change `Exceeds block gas limit` error to `exceeds block gas limit`
- `server.listen` isn't pre-bound to the `server` instance (`server.listen.bind(server)`)
- `provider.send` isn't pre-bound to the `provider` instance (`provider.listen.bind(provider)`)
- remove `options.keepAliveTimeout`
- rename `provider.removeAllListeners` to `provider.clearListeners`
- `provider.close` is now `provider.disconnect` and returns a Promise (no callback argument)
- return `Cannot wrap a "[a-zA-Z]+" as a json-rpc type` on `evm_revert` error instead of `invalid type` or `false` for invalid snapshot ids
- change invalid string handling to error with `cannot convert string value ${value} into type Quantity; strings must be hex-encoded and prefixed with "0x".`
- change `Method {method} not supported` error to `The method {method} does not exist/is not available`
- return error `header not found` for requests to non-existent blocks
- replace mutable `provider.options` with `provider.getOptions()`; `getOptions` now returns a deep clone of the options object
- default `coinbase` (`eth_coinbase` RPC call) is now the `0x0` address (fixes #201)
- `sender doesn't have enough funds to send tx` errors are now prefixed with `VM Exception while processing transaction`
- `logs` subscription events are emitted before `newHeads` events
- the default `callGasLimit` has changed from `Number.MAX_SAFE_INTEGER` ($2^{53} - 1$) to `50_000_000`.



[^1]: yarn and pnpm don't support dependency lock files, like npm's npm-shrinkwrap.json,
which permits supply-chain attacks through automatic transitive dependency
updates, like the [left-pad attack](https://blog.npmjs.org/post/141577284765/kik-left-pad-and-npm.html) and mostly recently the
[colors and faker attack](https://security.snyk.io/vuln/SNYK-JS-COLORS-2331906).

[^2]: `eth_call` can't always perfectly reproduce the state that the original
transaction was run in if other transactions run before it in a block. This is
very rare in testing scenarios, but should be something you are aware of. We'll
be addressing this shortcoming in a future EIP and release by extending eth_call
with an option to run the transaction at a certain _index_ in the specified
block (you likely won't ever see this option enabled on public nodes, like
Infura, as it can be a very CPU-intensive process).
