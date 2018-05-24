[![npm](https://img.shields.io/npm/v/ganache-core.svg)]()
[![npm](https://img.shields.io/npm/dm/ganache-core.svg)]()
[![Build Status](https://travis-ci.org/trufflesuite/ganache-core.svg?branch=master)](https://travis-ci.org/trufflesuite/ganache-core)
# Ganache Core

This is the core code that powers the Ganache application and the the Ganache command line tool.

# INSTALL

`ganache-core` is written in Javascript and distributed as a Node package via `npm`. Make sure you have Node.js (>= v8.9.0) installed, and your environment is capable of installing and compiling `npm` modules.

**macOS** Make sure you have the XCode Command Line Tools installed. These are needed in general to be able to compile most C based languages on your machine, as well as many npm modules.

**Windows** See our [Windows install instructions](https://github.com/ethereumjs/testrpc/wiki/Installing-TestRPC-on-Windows).

**Ubuntu/Linux** Follow the basic instructions for installing [Node.js](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions) and make sure that you have `npm` installed, as well as the `build-essential` `apt` package (it supplies `make` which you will need to compile most things). Use the official Node.js packages, *do not use the package supplied by your distribution.*


```Bash
npm install ganache-core
```

# USAGE

As a Web3 provider:

```javascript
var Ganache = require("ganache-core");
web3.setProvider(Ganache.provider());
```

As a general http server:

```javascript
var Ganache = require("ganache-core");
var server = Ganache.server();
server.listen(port, function(err, blockchain) {...});
```

Both `.provider()` and `.server()` take a single object which allows you to specify behavior of the Ganache instance. This parameter is optional. Available options are:

* `"accounts"`: `Array` of `Object`'s. Each object should have a balance key with a hexadecimal value. The key `secretKey` can also be specified, which represents the account's private key. If no `secretKey`, the address is auto-generated with the given balance. If specified, the key is used to determine the account's address.
* `"debug"`: `boolean` - Output VM opcodes for debugging
* `"logger"`: `Object` - Object, like `console`, that implements a `log()` function.
* `"mnemonic"`: Use a specific HD wallet mnemonic to generate initial addresses.
* `"port"`: Port number to listen on when running as a server.
* `"seed"`: Use arbitrary data to generate the HD wallet mnemonic to be used.
* `"default_balance_ether"`: `number` - The default account balance, specified in ether.
* `"total_accounts"`: `number` - Number of accounts to generate at startup.
* `"fork"`: `string` or `object` - When a `string`, same as `--fork` option above. Can also be a Web3 Provider object, optionally used in conjunction with the `fork_block_number` option below.
* `"fork_block_number"`: `string` or `number` - Block number the provider should fork from, when the `fork` option is specified. If the `fork` option is specified as a string including the `@` sign and a block number, the block number in the `fork` parameter takes precedence.
* `"network_id"`: `integer` - Same as `--networkId` option above.
* `"time"`: `Date` - Date that the first block should start. Use this feature, along with the `evm_increaseTime` method to test time-dependent code.
* `"locked"`: `boolean` - whether or not accounts are locked by default.
* `"unlocked_accounts"`: `Array` - array of addresses or address indexes specifying which accounts should be unlocked.
* `"db_path"`: `String` - Specify a path to a directory to save the chain database. If a database already exists, that chain will be initialized instead of creating a new one.
* `"db"`: `Object` - Specify an alternative database instance, for instance [MemDOWN](https://github.com/level/memdown).
* `"ws"`: Enable a websocket server. This is `true` by default.
* `"vmErrorsOnRPCResponse"`: Whether to report runtime errors from EVM code as RPC errors. This is `true` by default to replicate the error reporting behavior of previous versions of ganache.
* `"hdPath"`: The hierarchical deterministic path to use when generating accounts. Default: "m/44'/60'/0'/0/"

# IMPLEMENTED METHODS

The RPC methods currently implemented are:

* `bzz_hive` (stub)
* `bzz_info` (stub)
* `debug_traceTransaction`
* `eth_accounts`
* `eth_blockNumber`
* `eth_call`
* `eth_coinbase`
* `eth_estimateGas`
* `eth_gasPrice`
* `eth_getBalance`
* `eth_getBlockByNumber`
* `eth_getBlockByHash`
* `eth_getBlockTransactionCountByHash`
* `eth_getBlockTransactionCountByNumber`
* `eth_getCode` (only supports block number “latest”)
* `eth_getCompilers`
* `eth_getFilterChanges`
* `eth_getFilterLogs`
* `eth_getLogs`
* `eth_getStorageAt`
* `eth_getTransactionByHash`
* `eth_getTransactionByBlockHashAndIndex`
* `eth_getTransactionByBlockNumberAndIndex`
* `eth_getTransactionCount`
* `eth_getTransactionReceipt`
* `eth_hashrate`
* `eth_mining`
* `eth_newBlockFilter`
* `eth_newFilter` (includes log/event filters)
* `eth_protocolVersion`
* `eth_sendTransaction`
* `eth_sendRawTransaction`
* `eth_sign`
* `eth_subscribe` (only for websocket connections. "syncing" subscriptions are not yet supported)
* `eth_unsubscribe` (only for websocket connections. "syncing" subscriptions are not yet supported)
* `eth_syncing`
* `eth_uninstallFilter`
* `net_listening`
* `net_peerCount`
* `net_version`
* `miner_start`
* `miner_stop`
* `personal_listAccounts`
* `personal_lockAccount`
* `personal_newAccount`
* `personal_importRawKey`
* `personal_unlockAccount`
* `personal_sendTransaction`
* `shh_version`
* `rpc_modules`
* `web3_clientVersion`
* `web3_sha3`

There’s also special non-standard methods that aren’t included within the original RPC specification:

* `evm_snapshot` : Snapshot the state of the blockchain at the current block. Takes no parameters. Returns the integer id of the snapshot created.
* `evm_revert` : Revert the state of the blockchain to a previous snapshot. Takes a single parameter, which is the snapshot id to revert to. If no snapshot id is passed it will revert to the latest snapshot. Returns `true`.
* `evm_increaseTime` : Jump forward in time. Takes one parameter, which is the amount of time to increase in seconds. Returns the total time adjustment, in seconds.
* `evm_mine` : Force a block to be mined. Takes no parameters. Mines a block independent of whether or not mining is started or stopped.

# Unsupported Methods

* `eth_compileSolidity`: If you'd like Solidity compilation in Javascript, please see the [solc-js project](https://github.com/ethereum/solc-js).


# TESTING

Run tests via:

```
$ npm test
```

# LICENSE
[MIT](https://tldrlegal.com/license/mit-license)
