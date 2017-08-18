[![npm](https://img.shields.io/npm/v/ethereumjs-testrpc.svg)]()
[![npm](https://img.shields.io/npm/dm/ethereumjs-testrpc.svg)]()
[![Build Status](https://travis-ci.org/ethereumjs/testrpc.svg?branch=master)](https://travis-ci.org/ethereumjs/testrpc)

*NOTE: As of version `3.0.2`, `testrpc` requires at least `Node 6.9.1` to run - this is because the `ethereumjs-vm@2.0.1` dependency is now shipping using ES2015 language features.*

# Welcome to `testrpc`

`testrpc` is a Node.js based Ethereum client for testing and development. It uses ethereumjs to simulate full client behavior and make developing Ethereum applications much faster. It also includes all popular RPC functions and features (like events) and can be run deterministically to make development a breeze.

# INSTALL

`testrpc` is written in Javascript and distributed as a Node package via `npm`. Make sure you have Node.js (>= v6.9.1) installed, and your environment is capable of installing and compiling `npm` modules.

**macOS** Make sure you have the XCode Command Line Tools installed. These are needed in general to be able to compile most C based languages on your machine, as well as many npm modules.

**Windows** See our [Windows install instructions](https://github.com/ethereumjs/testrpc/wiki/Installing-TestRPC-on-Windows).

**Ubuntu/Linux** Follow the basic instructions for installing [Node.js](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions) and make sure that you have `npm` installed, as well as the `build-essential` `apt` package (it supplies `make` which you will need to compile most things). Use the official Node.js packages, *do not use the package supplied by your distribution.*


```Bash
npm install -g ethereumjs-testrpc
```

Having problems? Be sure to check out the [FAQ](https://github.com/ethereumjs/testrpc/wiki/FAQ) and if you're still having issues and you're sure its a problem with `testrpc` please open an issue.

# USAGE

### Command Line

```Bash
$ testrpc <options>
```

Options:

* `-a` or `--accounts`: Specify the number of accounts to generate at startup.
* `-b` or `--blocktime`: Specify blocktime in seconds for automatic mining. Default is 0 and no auto-mining.
* `-d` or `--deterministic`: Generate deterministic addresses based on a pre-defined mnemonic.
* `-n` or `--secure`: Lock available accounts by default (good for third party transaction signing)
* `-m` or `--mnemonic`: Use a specific HD wallet mnemonic to generate initial addresses.
* `-p` or `--port`: Port number to listen on. Defaults to 8545.
* `-h` or `--hostname`: Hostname to listen on. Defaults to Node's `server.listen()` [default](https://nodejs.org/api/http.html#http_server_listen_port_hostname_backlog_callback).
* `-s` or `--seed`: Use arbitrary data to generate the HD wallet mnemonic to be used.
* `-g` or `--gasPrice`: Use a custom Gas Price (defaults to 20000000000)
* `-l` or `--gasLimit`: Use a custom Gas Limit (defaults to 0x47E7C4)
* `-f` or `--fork`: Fork from another currently running Ethereum client at a given block. Input should be the HTTP location and port of the other client, e.g. `http://localhost:8545`. You can optionally specify the block to fork from using an `@` sign: `http://localhost:8545@1599200`.
* `-i` or `--network-id`: Specify the network id the TestRPC will use to identify itself (defaults to the current time or the network id of the forked blockchain if configured)
* `--db`: Specify a path to a directory to save the chain database. If a database already exists, the TestRPC will initialize that chain instead of creating a new one.
* `--debug`: Output VM opcodes for debugging
* `--mem`: Output TestRPC memory usage statistics. This replaces normal output.

Special Options:

* `--account`: Specify `--account=...` (no 's') any number of times passing arbitrary private keys and their associated balances to generate initial addresses:

  ```
  $ testrpc --account="<privatekey>,balance" [--account="<privatekey>,balance"]
  ```

  Note that private keys are 64 characters long, and must be input as a 0x-prefixed hex string. Balance can either be input as an integer or 0x-prefixed hex value specifying the amount of wei in that account.

  An HD wallet will not be created for you when using `--account`.

* `-u` or `--unlock`: Specify `--unlock ...` any number of times passing either an address or an account index to unlock specific accounts. When used in conjunction with `--secure`, `--unlock` will override the locked state of specified accounts.

  ```
  $ testrpc --secure --unlock "0x1234..." --unlock "0xabcd..."
  ```

  You can also specify a number, unlocking accounts by their index:

  ```
  $ testrpc --secure -u 0 -u 1
  ```

  This feature can also be used to impersonate accounts and unlock addresses you wouldn't otherwise have access to. When used with the `--fork` feature, you can use the TestRPC to make transactions as any address on the blockchain, which is very useful for testing and dynamic analysis.

### Library

As a Web3 provider:

```javascript
var TestRPC = require("ethereumjs-testrpc");
web3.setProvider(TestRPC.provider());
```

As a general http server:

```javascript
var TestRPC = require("ethereumjs-testrpc");
var server = TestRPC.server();
server.listen(port, function(err, blockchain) {...});
```

Both `.provider()` and `.server()` take a single object which allows you to specify behavior of the TestRPC. This parameter is optional. Available options are:

* `"accounts"`: `Array` of `Object`'s. Each object should have a balance key with a hexadecimal value. The key `secretKey` can also be specified, which represents the account's private key. If no `secretKey`, the address is auto-generated with the given balance. If specified, the key is used to determine the account's address.
* `"debug"`: `boolean` - Output VM opcodes for debugging
* `"logger"`: `Object` - Object, like `console`, that implements a `log()` function.
* `"mnemonic"`: Use a specific HD wallet mnemonic to generate initial addresses.
* `"port"`: Port number to listen on when running as a server.
* `"seed"`: Use arbitrary data to generate the HD wallet mnemonic to be used.
* `"total_accounts"`: `number` - Number of accounts to generate at startup.
* `"fork"`: `string` or `object` - When a `string`, same as `--fork` option above. Can also be a Web3 Provider object, optionally used in conjunction with the `fork_block_number` option below.
* `"fork_block_number"`: `string` or `number` - Block number the provider should fork from, when the `fork` option is specified. If the `fork` option is specified as a string including the `@` sign and a block number, the block number in the `fork` parameter takes precedence.  
* `"network_id"`: `integer` - Same as `--networkId` option above.
* `"time"`: `Date` - Date that the first block should start. Use this feature, along with the `evm_increaseTime` method to test time-dependent code.
* `"locked"`: `boolean` - whether or not accounts are locked by default.
* `"unlocked_accounts"`: `Array` - array of addresses or address indexes specifying which accounts should be unlocked.
* `"db_path"`: `String` - Specify a path to a directory to save the chain database. If a database already exists, the TestRPC will initialize that chain instead of creating a new one.

# IMPLEMENTED METHODS

The RPC methods currently implemented are:

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
* `eth_protocolVersion` (stub, returns -1)
* `eth_sendTransaction`
* `eth_sendRawTransaction`
* `eth_sign`
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
* `personal_unlockAccount`
* `personal_sendTransaction`
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

# Docker

The Simplest way to get started with the Docker image:

```Bash
docker run -d -p 8545:8545 ethereumjs/testrpc:latest
```

To pass options to testrpc through Docker simply add the arguments to
the run command:

```Bash
docker run -d -p 8545:8545 ethereumjs/testrpc:latest -a 10 --debug
```

To build the Docker container from source:

```Bash
git clone https://github.com/ethereumjs/testrpc.git && cd testrpc
docker build -t ethereumjs/testrpc .
```


# TESTING

Run tests via:

```
$ npm test
```

# LICENSE
[MPL-2.0](https://tldrlegal.com/license/mozilla-public-license-2.0-(mpl-2))
