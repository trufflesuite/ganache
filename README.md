[![npm](https://img.shields.io/npm/v/ganache-core.svg)]()
[![npm](https://img.shields.io/npm/dm/ganache-core.svg)]()
[![Build Status](https://travis-ci.org/trufflesuite/ganache-core.svg?branch=master)](https://travis-ci.org/trufflesuite/ganache-core)
[![Coverage Status](https://coveralls.io/repos/github/trufflesuite/ganache-core/badge.svg?branch=develop)](https://coveralls.io/github/trufflesuite/ganache-core?branch=develop)
# Ganache Core

[Usage](#usage) | [Options](#options) | [Implemented Methods](#implemented-methods) | [Custom Methods](#custom-methods) | [Unsupported Methods](#unsupported-methods) | [Testing](#testing)
--- | --- | --- | --- | --- | ---

This is the core code that powers the Ganache application and the the Ganache command line tool.

# INSTALLATION

`ganache-core` is written in JavaScript and distributed as a Node.js package via `npm`. Make sure you have Node.js (>= v8.9.0) installed, and your environment is capable of installing and compiling `npm` modules.

**macOS** Make sure you have the XCode Command Line Tools installed. These are needed in general to be able to compile most C based languages on your machine, as well as many npm modules.

**Windows** See our [Windows install instructions](https://github.com/trufflesuite/ganache-cli/wiki/Installing-ganache-cli-on-Windows).

**Ubuntu/Linux** Follow the basic instructions for installing [Node.js](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions) and make sure that you have `npm` installed, as well as the `build-essential` `apt` package (it supplies `make` which you will need to compile most things). Use the official Node.js packages, *do not use the package supplied by your distribution.*

Using npm:

```Bash
npm install ganache-core
```

or, if you are using [Yarn](https://yarnpkg.com/):

```Bash
yarn add ganache-core
```


# USAGE

As a [Web3](https://github.com/ethereum/web3.js/) provider:

```javascript
const ganache = require("ganache-core");
web3.setProvider(ganache.provider());
```

As an [ethers.js](https://github.com/ethers-io/ethers.js/) provider:

```javascript
const ganache = require("ganache-core");
const provider = new ethers.providers.Web3Provider(ganache.provider());
```

As a general HTTP and WebSocket server:

```javascript
const ganache = require("ganache-core");
const server = ganache.server();
server.listen(port, function(err, blockchain) {...});
```

# OPTIONS

Both `.provider()` and `.server()` take a single object which allows you to specify behavior of the Ganache instance. This parameter is optional. Available options are:

* `"accounts"`: `Array` of `Object`'s. Each object should have a `balance` key with a hexadecimal value. The key `secretKey` can also be specified, which represents the account's private key. If no `secretKey`, the address is auto-generated with the given balance. If specified, the key is used to determine the account's address.
* `"debug"`: `boolean` - Output VM opcodes for debugging
* `"blockTime"`: `number` - Specify blockTime in seconds for automatic mining. If you don't specify this flag, ganache will instantly mine a new block for every transaction. Using the `blockTime` option is discouraged unless you have tests which require a specific mining interval.
* `"logger"`: `Object` - Object, like `console`, that implements a `log()` function.
* `"mnemonic"`: Use a specific HD wallet mnemonic to generate initial addresses.
* `"port"`: `number` Port number to listen on when running as a server.
* `"seed"`: Use arbitrary data to generate the HD wallet mnemonic to be used.
* `"default_balance_ether"`: `number` - The default account balance, specified in ether.
* `"total_accounts"`: `number` - Number of accounts to generate at startup.
* `"fork"`: `string` or `object` - Fork from another currently running Ethereum client at a given block.  When a `string`, input should be the HTTP location and port of the other client, e.g. `http://localhost:8545`. You can optionally specify the block to fork from using an `@` sign: `http://localhost:8545@1599200`. Can also be a `Web3 Provider` object, optionally used in conjunction with the `fork_block_number` option below.
* `"fork_block_number"`: `string` or `number` - Block number the provider should fork from, when the `fork` option is specified. If the `fork` option is specified as a string including the `@` sign and a block number, the block number in the `fork` parameter takes precedence.
* `"network_id"`: Specify the network id ganache-core will use to identify itself (defaults to the current time or the network id of the forked blockchain if configured)
* `"time"`: `Date` - Date that the first block should start. Use this feature, along with the `evm_increaseTime` method to test time-dependent code.
* `"locked"`: `boolean` - whether or not accounts are locked by default.
* `"unlocked_accounts"`: `Array` - array of addresses or address indexes specifying which accounts should be unlocked.
* `"db_path"`: `String` - Specify a path to a directory to save the chain database. If a database already exists, `ganache-core` will initialize that chain instead of creating a new one.
* `"db"`: `Object` - Specify an alternative database instance, for instance [MemDOWN](https://github.com/level/memdown).
* `"ws"`: `boolean` Enable a websocket server. This is `true` by default.
* `"account_keys_path"`: `String` - Specifies a file to save accounts and private keys to, for testing.
* `"vmErrorsOnRPCResponse"`: `boolean` - Whether or not to transmit transaction failures as RPC errors. Set to `false` for error reporting behaviour which is compatible with other clients such as geth and Parity. This is `true` by default to replicate the error reporting behavior of previous versions of ganache.
* `"hdPath"`: The hierarchical deterministic path to use when generating accounts. Default: "m/44'/60'/0'/0/"
* `"hardfork"`: `String` Allows users to specify which hardfork should be used. Supported hardforks are `byzantium`, `constantinople`, and `petersburg` (default).
* `"allowUnlimitedContractSize"`: `boolean` - Allows unlimited contract sizes while debugging. By setting this to `true`, the check within the EVM for contract size limit of 24KB (see [EIP-170](https://git.io/vxZkK)) is bypassed. Setting this to `true` **will** cause `ganache-core` to behave differently than production environments. (default: `false`; **ONLY** set to `true` during debugging).
* `"gasPrice"`: `String::hex` Sets the default gas price for transactions if not otherwise specified. Must be specified as a `hex` encoded string in `wei`. Defaults to `"0x77359400"` (2 gwei).
* `"gasLimit"`: `String::hex` Sets the block gas limit. Must be specified as a `hex` string. Defaults to `"0x6691b7"`.
* `"keepAliveTimeout"`:  `number` If using `.server()` - Sets the HTTP server's `keepAliveTimeout` in milliseconds. See the [NodeJS HTTP docs](https://nodejs.org/api/http.html#http_server_keepalivetimeout) for details. `5000` by default.

# IMPLEMENTED METHODS

The RPC methods currently implemented are:

* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#bzz_hive" target="_blank">bzz_hive</a> (stub)
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#bzz_info" target="_blank">bzz_info</a> (stub)
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#debug_traceTransaction" target="_blank">debug_traceTransaction</a> (without support for `tracer` option)
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_accounts" target="_blank">eth_accounts</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_blockNumber" target="_blank">eth_blockNumber</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_call" target="_blank">eth_call</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_coinbase" target="_blank">eth_coinbase</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_estimateGas" target="_blank">eth_estimateGas</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_gasPrice" target="_blank">eth_gasPrice</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getBalance" target="_blank">eth_getBalance</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getBlockByNumber" target="_blank">eth_getBlockByNumber</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getBlockByHash" target="_blank">eth_getBlockByHash</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getBlockTransactionCountByHash" target="_blank">eth_getBlockTransactionCountByHash</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getBlockTransactionCountByNumber" target="_blank">eth_getBlockTransactionCountByNumber</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getCode" target="_blank">eth_getCode</a> (only supports block number “latest”)
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getCompilers" target="_blank">eth_getCompilers</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getFilterChanges" target="_blank">eth_getFilterChanges</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getFilterLogs" target="_blank">eth_getFilterLogs</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getLogs" target="_blank">eth_getLogs</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getStorageAt" target="_blank">eth_getStorageAt</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getTransactionByHash" target="_blank">eth_getTransactionByHash</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getTransactionByBlockHashAndIndex" target="_blank">eth_getTransactionByBlockHashAndIndex</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getTransactionByBlockNumberAndIndex" target="_blank">eth_getTransactionByBlockNumberAndIndex</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getTransactionCount" target="_blank">eth_getTransactionCount</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getTransactionReceipt" target="_blank">eth_getTransactionReceipt</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_hashrate" target="_blank">eth_hashrate</a></a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_mining" target="_blank">eth_mining</a></a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_newBlockFilter" target="_blank">eth_newBlockFilter</a></a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_newFilter" target="_blank">eth_newFilter</a> (includes log/event filters)
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_protocolVersion" target="_blank">eth_protocolVersion</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sendTransaction" target="_blank">eth_sendTransaction</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sendRawTransaction" target="_blank">eth_sendRawTransaction</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign" target="_blank">eth_sign</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_subscribe" target="_blank">eth_subscribe</a> (only for websocket connections.)
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_unsubscribe" target="_blank">eth_unsubscribe</a> (only for websocket connections.)
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#shh_version" target="_blank">shh_version</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#personal_sendTransaction" target="_blank">personal_sendTransaction</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#personal_unlockAccount" target="_blank">personal_unlockAccount</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#personal_importRawKey" target="_blank">personal_importRawKey</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#personal_newAccount" target="_blank">personal_newAccount</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#personal_lockAccount" target="_blank">personal_lockAccount</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#personal_listAccounts" target="_blank">personal_listAccounts</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#net_version" target="_blank">net_version</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#net_peerCount" target="_blank">net_peerCount</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#net_listening" target="_blank">net_listening</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_uninstallFilter" target="_blank">eth_uninstallFilter</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_syncing" target="_blank">eth_syncing</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#web3_clientVersion" target="_blank">web3_clientVersion</a>
* <a href="https://github.com/ethereum/wiki/wiki/JSON-RPC#web3_sha3" target="_blank">web3_sha3</a>

# CUSTOM METHODS
Special non-standard methods that aren’t included within the original RPC specification:
* `evm_snapshot` : Snapshot the state of the blockchain at the current block. Takes no parameters. Returns the integer id of the snapshot created. **A snapshot can only be used once**. After a successful `evm_revert`, the same snapshot id cannot be used again. As such, consider creating a new snapshot after each `evm_revert` *if you need to revert to the same point multiple times*.
  ```bash
  curl -H "Content-Type: application/json" -X POST --data \
          '{"id":1337,"jsonrpc":"2.0","method":"evm_snapshot","params":[]}' \
          http://localhost:8545
  ```
* `evm_revert` : Revert the state of the blockchain to a previous snapshot. Takes a single parameter, which is the snapshot id to revert to. If no snapshot id is passed it will revert to the latest snapshot. Returns `true`.
  ```bash
  # Ex: ID "1" (hex encoded string)
  curl -H "Content-Type: application/json" -X POST --data \
          '{"id":1337,"jsonrpc":"2.0","method":"evm_revert","params":["0x1"]}' \
          http://localhost:8545
  ```
* `evm_increaseTime` : Jump forward in time. Takes one parameter, which is the amount of time to increase in seconds. Returns the total time adjustment, in seconds.
  ```bash
  # Ex: 1 minute (number)
  curl -H "Content-Type: application/json" -X POST --data \
          '{"id":1337,"jsonrpc":"2.0","method":"evm_increaseTime","params":[60]}' \
          http://localhost:8545
  ```
* `evm_mine` : Force a block to be mined. Takes one optional parameter, which is the timestamp a block should setup as the mining time. Mines a block **independent** of whether mining is *started* or *stopped*.
  ```bash
  # Ex: new Date("2009-01-03T18:15:05+00:00").getTime()
  curl -H "Content-Type: application/json" -X POST --data \
          '{"id":1337,"jsonrpc":"2.0","method":"evm_mine","params":[1231006505000]}' \
          http://localhost:8545
  ```
* `miner_start` : Resumes mining within ganache.
  ```bash
  curl -H "Content-Type: application/json" -X POST --data \
          '{"id":1337,"jsonrpc":"2.0","method":"miner_start","params":[]}' \
          http://localhost:8545
  ```
* `miner_stop` : Halts ganache from mining.
  ```bash
  curl -H "Content-Type: application/json" -X POST --data \
          '{"id":1337,"jsonrpc":"2.0","method":"miner_stop","params":[]}' \
          http://localhost:8545
  ```

# UNSUPPORTED METHODS

* `eth_compileSolidity`: If you'd like Solidity compilation in Javascript, please see the [solc-js project](https://github.com/ethereum/solc-js).


# TESTING

Run tests via:

```
$ npm test
```

# LICENSE
[MIT](https://tldrlegal.com/license/mit-license)
