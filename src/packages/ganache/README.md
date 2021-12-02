<!-- Using h2 instead of h1 because npm doesn't support align=center on h1 tags -->
<h2 align="center">
  <a href="#readme" title="Ganache README.md"><img alt="Ganache" src="https://trufflesuite.github.io/ganache/assets/img/ganache-logo-dark.svg" alt="Ganache" width="160"/></a>
</h2>

<h3 align="center">
  A tool for creating a local blockchain for fast Ethereum development.
</h3>

<p align="center">
  <a title="ganache on npm" href="https://www.npmjs.com/ganache"><img alt="" src="https://img.shields.io/npm/v/ganache/latest?label=npm&amp;color=b98b5b&amp;style=for-the-badge&amp;labelColor=3c2c30&amp;logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6IiBmaWxsPSIjZmZmIi8+PHBhdGggZmlsbD0iIzMzMjUyYSIgZD0iTTcgN2gyNnYyNmgtN1YxNGgtNnYxOUg3eiIvPjwvc3ZnPgo=" /></a>
  <a href="https://www.trufflesuite.com/dashboard" title="Trufflesuite download dashboard"><img alt="" src="https://img.shields.io/npm/dm/ganache?color=b98b5b&amp;style=for-the-badge&amp;labelColor=3c2c30&amp;logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOTAuMzEgMjE0Ij48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6I2U0YTY2Mzt9LmNscy0ye2ZpbGw6IzVlNDY0ZDt9LmNscy0ze2ZpbGw6I2ZmZjt9PC9zdHlsZT48L2RlZnM+PHRpdGxlPmdhbmFjaGUtbG9nb21hcms8L3RpdGxlPjxnIGlkPSJMYXllcl8yIiBkYXRhLW5hbWU9IkxheWVyIDIiPjxnIGlkPSJMYXllcl84IiBkYXRhLW5hbWU9IkxheWVyIDgiPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE2NS4zOCwxNjAuMzFjMi4yNCwwLDMtLjUyLDQuMDYtMi4zM3MuNTUtNC43NS41MS01LjU1Yy0uMS0xLjc2LS42OS0zLjcyLS43Ni00LjctLjA1LS42LDAtNC40My4wOS02LDEuMzQtMjQuODQsMTItMzAuNzUsMTUuMDctMzEuNDJhOC41OSw4LjU5LDAsMCwxLDUuOTQuNGwwLTM4aDBsMC0uNTRWNjIuMDljMC01LjQ5LTMuOTEtMTIuMjQtOC42Ni0xNWwtNzcuODctNDVDOTktLjY5LDkxLjE5LS42OSw4Ni40MywyLjA2TDguNjUsNDdDMy44OSw0OS43MSwwLDU2LjQ2LDAsNjJ2OS44MnMwLC4xMSwwLC4xN1Y4Ni4zM2MuNDUuMjUuOTEuNTEsMS4zNi43OSwxLjUsMSwzLDEuNTUsNC41MSwyLjZhNjguNDMsNjguNDMsMCwwLDEsMTIsOS4yOGMuNy42OCwzLjA3LDMuNjYsMy42NCw0LjM2YTQ3LjIyLDQ3LjIyLDAsMCwwLDUuNzcsNi42LDIwLjYyLDIwLjYyLDAsMCwwLDMuODcsMi43OGMyLjI4LDEuMTksNi4wNy45Miw4LC4wNywxNC44Mi02LjQyLDI0LjEyLTMuMiwyOC40MS0uNjIsMTAuNjEsNi4zNywxNC4xNSwxNS4yOCwxNS4yOCwyNi4xYTI5LjIyLDI5LjIyLDAsMCwxLC4xNCw0LjIyYzAsMi41Ny0uMDksNi43LDIuNjIsNy4zOSwzLjg5LDEsNC44My0zLjE2LDUuNDEtNS45MiwxLjMyLTYuMjUsOS42My0xMC4zNSwxNS43Mi03LjIsNC4yLDIuMTcsNS45MiwzLjQsMTAuMDcsMS41Nyw1LjItMi4yOSw3Ljg3LTguMTIsOS42OC0xMS4yMkExOSwxOSwwLDAsMSwxMzQsMTIwYzguMTEtNS4wNSwyOC40Ni0zLjc0LDI5LjIxLDE4LjcsMCwxLjIyLDAsNC4zNCwwLDYuMjQsMCwyLjE0LjA3LDQuMjMtLjA3LDYuNDQtLjA4LDEuNDctLjM1LDMtLjQ5LDQuNTFDMTYyLjU1LDE1NS45LDE2MS43OSwxNjAuMjksMTY1LjM4LDE2MC4zMVoiLz48cGF0aCBjbGFzcz0iY2xzLTIiIGQ9Ik0xOTAuMjgsMTEwLjc1Yy0uNTYtLjE3LTIuMTYtMS4yMi01LjkzLS40LTMuMDkuNjctMTMuNzMsNi41OC0xNS4wNywzMS40Mi0uMDgsMS41My0uMTQsNS4zNi0uMDksNiwuMDcsMSwuNjYsMi45NC43Niw0LjcsMCwuOC42MiwzLjctLjUxLDUuNTVzLTEuODIsMi4zNC00LjA2LDIuMzNjLTMuNTksMC0yLjgzLTQuNDEtMi44My00LjQxLjE0LTEuNDkuNDEtMywuNDktNC41MS4xNC0yLjIxLjA3LTQuMy4wNy02LjQ0LDAtMS45LDAtNSwwLTYuMjRDMTYyLjQxLDExNi4yNywxNDIuMDYsMTE1LDEzNCwxMjBhMTksMTksMCwwLDAtNy40OCw3LjEyYy0xLjgxLDMuMS00LjQ4LDguOTMtOS42OCwxMS4yMi00LjE1LDEuODMtNS44Ny42LTEwLjA3LTEuNTctNi4wOS0zLjE1LTE0LjQuOTUtMTUuNzIsNy4yLS41OCwyLjc2LTEuNTIsNi45MS01LjQxLDUuOTItMi43MS0uNjktMi42Mi00LjgyLTIuNjItNy4zOWEyOS4yMiwyOS4yMiwwLDAsMC0uMTQtNC4yMmMtMS4xMy0xMC44Mi00LjY3LTE5LjczLTE1LjI4LTI2LjEtNC4yOS0yLjU4LTEzLjU5LTUuOC0yOC40MS42Mi0yLC44NS01Ljc0LDEuMTItOC0uMDdBMjAuNjIsMjAuNjIsMCwwLDEsMjcuMjUsMTEwYTQ3LjIyLDQ3LjIyLDAsMCwxLTUuNzctNi42Yy0uNTctLjctMi45NC0zLjY4LTMuNjQtNC4zNmE2OC40Myw2OC40MywwLDAsMC0xMi05LjI4Yy0xLjUyLTEtMy0xLjY0LTQuNTEtMi42LS40NS0uMjgtLjkxLS41NC0xLjM2LS43OWwwLDY1LjU3YzAsNS41LDMuOSwxMi4yNSw4LjY2LDE1bDc3Ljg2LDQ1YzQuNzYsMi43NiwxMi41NSwyLjc2LDE3LjMxLDBMMTgxLjY2LDE2N2M0Ljc2LTIuNzUsOC42NS05LjUsOC42NS0xNVoiLz48cGF0aCBjbGFzcz0iY2xzLTMiIGQ9Ik0xMDUsOTkuNzNjLTUuMzksMy4xMS0xNC4yLDMuMTEtMTkuNTgsMGwtNzkuNjEtNDJjLjkuODksODAuNzMsNDcuMjcsODAuNzMsNDcuMjcsNC43NiwyLjc2LDEyLjU1LDIuNzYsMTcuMzEsMCwwLDAsNzkuNzQtNDYuMjQsODAuNjMtNDcuMTNaIi8+PHBhdGggY2xhc3M9ImNscy0zIiBkPSJNODUuMzIsOC4wOEM5MC43MSw1LDk5LjUyLDUsMTA0LjksOC4wOWw5LjY1LDRjLS45LS44OS0xMC43OC03LjI5LTEwLjc4LTcuMjktNC43NS0yLjc1LTEyLjU0LTIuNzYtMTcuMywwLDAsMC0xNS43Nyw5LjI3LTE2LjY3LDEwLjE1WiIvPjwvZz48L2c+PC9zdmc+" /></a>
  <a title="Build status" href="https://github.com/trufflesuite/ganache/actions?query=workflow%3ACommits+branch%3Adevelop+event%3Apush"><img alt="" src="https://img.shields.io/github/workflow/status/trufflesuite/ganache/Commits/develop?event=push&amp;style=for-the-badge&amp;labelColor=3c2c30&amp;logo=github&amp;color=b98b5b"></a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#community">Community</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#related">Related</a>
</p>

---

## Features

Ganache is an Ethereum simulator that makes developing Ethereum applications faster, easier, and safer. It includes all popular RPC functions and features (like events) and can be run deterministically to make development a breeze.

- Fork any Ethereum network without waiting to sync
- Ethereum json-rpc support
- Snapshot/revert state
- Mine blocks instantly, on demand, or at an interval
- Fast-forward time
- Impersonate any account (no private keys required!)
- Listens for JSON-RPC 2.0 requests over HTTP/WebSockets
- Programmatic use in Node.js
- Pending Transactions

## Getting Started

Ganache can be used from the [command line](#command-line-use), [programmatically](#programmatic-use) via Node.js, or [in the browser](#browser-use).

### Command line use

You must first install [Node.js](https://nodejs.org/) >= v10.13.0 and npm >= 6.4.1.

To install Ganache globally, run:

```console
$ npm install ganache --global
```

Once installed globally, you can start ganache right from your command line:

```console
$ ganache
Ganache CLI v6.12.1 (ganache-core: 2.13.1)

Available Accounts
==================
(0) 0xe261e26aECcE52b3788Fac9625896FFbc6bb4424 (100 ETH)
(1) 0xcE16e8eb8F4BF2E65BA9536C07E305b912BAFaCF (100 ETH)
(2) 0x02f1c4C93AFEd946Cce5Ad7D34354A150bEfCFcF (100 ETH)
(3) 0x0B75F0b70076Fab3F18F94700Ecaf3B00fE528E7 (100 ETH)
(4) 0x7194d1F1d43c2c58302BB61a224D41B649e65C93 (100 ETH)
(5) 0xC9A2d92c5913eDEAd9a7C936C96631F0F2241063 (100 ETH)
(6) 0xD79BcDE5Cb11cECD1dfC6685B65690bE5b6a611e (100 ETH)
(7) 0xb6D080353f40dEcA2E67108087c356d3A1AfcD64 (100 ETH)
(8) 0x31A064DeeaD74DE7B9453beB4F780416D8859d3b (100 ETH)
(9) 0x37524a360a40C682F201Fb011DB7bbC8c8A247c6 (100 ETH)

Private Keys
==================
(0) 0x7f109a9e3b0d8ecfba9cc23a3614433ce0fa7ddcc80f2a8f10b222179a5a80d6
(1) 0x6ec1f2e7d126a74a1d2ff9e1c5d90b92378c725e506651ff8bb8616a5c724628
(2) 0xb4d7f7e82f61d81c95985771b8abf518f9328d019c36849d4214b5f995d13814
(3) 0x941536648ac10d5734973e94df413c17809d6cc5e24cd11e947e685acfbd12ae
(4) 0x5829cf333ef66b6bdd34950f096cb24e06ef041c5f63e577b4f3362309125863
(5) 0x8fc4bffe2b40b2b7db7fd937736c4575a0925511d7a0a2dfc3274e8c17b41d20
(6) 0xb6c10e2baaeba1fa4a8b73644db4f28f4bf0912cceb6e8959f73bb423c33bd84
(7) 0xfe8875acb38f684b2025d5472445b8e4745705a9e7adc9b0485a05df790df700
(8) 0xbdc6e0a69f2921a78e9af930111334a41d3fab44653c8de0775572c526feea2d
(9) 0x3e215c3d2a59626a669ed04ec1700f36c05c9b216e592f58bbfd3d8aa6ea25f9

HD Wallet
==================
Mnemonic:      candy maple velvet cake sugar cream honey rich smooth crumble sweet treat
Base HD Path:  m/44'/60'/0'/0/{account_index}

Default Gas Price
==================
20000000000

Gas Limit
==================
6721975

Call Gas Limit
==================
9007199254740991

Listening on 127.0.0.1:8545
```

To install Ganache into an npm project, run:

```console
$ npm install ganache
```

You can then add Ganache to your package.json scripts:

```json
"scripts": {
  "ganache": "ganache --wallet.seed myCustomSeed"
}
```

_See [Documentation](#documentation) for additional command line options._

Then start it:

```console
$ npm run ganache
```

### Programmatic use

You can use Ganache programmatically from Node.js. Install Ganache into your npm package:

```console
$ npm install ganache
```

Then you can use ganache as an [EIP-1193 provider only](#as-an-eip-1193-provider-only), an [EIP-1193 provider and JSON-RPC web server](#as-an-eip-1193-provider-and-json-rpc-web-server), as a [Web3 provider](#as-a-web3js-provider), or an [ethers provider](#as-an-ethersjs-provider).

#### As an EIP-1193 provider only:

```javascript
const ganache = require("ganache");

const options = {};
const provider = ganache.provider(options);
const accounts = await provider.request({ method: "eth_accounts", params: [] });
```

#### As an EIP-1193 provider and JSON-RPC web server:

```javascript
const ganache = require("ganache");

const options = {};
const server = ganache.server(options);
const PORT = 8545;
server.listen(PORT, err => {
  if (err) throw err;

  console.log(`ganache listening on port ${PORT}...`);
  const provider = server.provider;
  const accounts = await provider.request({ method: "eth_accounts", params:[] });
});
```

#### As a [web3.js](https://www.npmjs.com/package/web3) provider:

To use ganache as a Web3 provider:

```javascript
const Web3 = require("web3");
const ganache = require("ganache");

const web3 = new Web3(ganache.provider());
```

NOTE: depending on your web3 version, you may need to set a number of confirmation blocks

```
const web3 = new Web3(ganache.provider(), null, { transactionConfirmationBlocks: 1 });
```

#### As an [ethers.js]() provider:

```javascript
const ganache = require("ganache");

const provider = new ethers.providers.Web3Provider(ganache.provider());
```

### Browser Use

You can also use Ganache in the browser by adding the following script to your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/ganache@latest/dist/web/ganache.min.js"></script>
```

NOTE: the `latest` in the above path needs to be replaced with a version number or tag that is listed in [npm](https://www.npmjs.com/package/ganache?activeTab=versions).

From there, Ganache is available in your browser for use:

```javascript
const options = {};
const provider = Ganache.provider(options);
```

## Documentation

New interactive RPC documentation coming soon! Give this repository a star and watch for releases to be notified of its official launch!

### RPC Methods

Ganache Ethereum JSON-RPC documentation.

#### bzz_hive

Returns the kademlia table in a readable table format.

##### Returns

`Promise<any[]>` : Returns the kademlia table in a readable table format.

---

#### bzz_info

Returns details about the swarm node.

##### Returns

`Promise<any[]>` : Returns details about the swarm node.

---

#### db_getHex

Returns binary data from the local database.

##### Arguments

- `dbName: string` : Database name.
- `key: string` : Key name.

##### Returns

`Promise<string>` : The previously stored data.

---

#### db_getString

Returns string from the local database.

##### Arguments

- `dbName: string` : Database name.
- `key: string` : Key name.

##### Returns

`Promise<string>` : The previously stored string.

---

#### db_putHex

Stores binary data in the local database.

##### Arguments

- `dbName: string` : Database name.
- `key: string` : Key name.
- `data: DATA` : Data to store.

##### Returns

`Promise<boolean>` : true if the value was stored, otherwise false.

---

#### db_putString

Stores a string in the local database.

##### Arguments

- `dbName: string` : Database name.
- `key: string` : Key name.
- `value: string` : String to store.

##### Returns

`Promise<boolean>` : returns true if the value was stored, otherwise false.

---

#### debug_storageRangeAt

Attempts to replay the transaction as it was executed on the network and return storage data given a starting key and max number of entries to return.

##### Arguments

- `blockHash: DATA` : Hash of a block.
- `transactionIndex: number` : Integer of the transaction index position.
- `contractAddress: DATA` : Address of the contract.
- `startKey: DATA` : Hash of the start key for grabbing storage entries.
- `maxResult: number` : Integer of maximum number of storage entries to return.

##### Returns

`Promise<StorageRangeResult>` : Returns a storage object with the keys being keccak-256 hashes of the storage keys, and the values being the raw, unhashed key and value for that specific storage slot. Also returns a next key which is the keccak-256 hash of the next key in storage for continuous downloading.

---

#### debug_traceTransaction

Attempt to run the transaction in the exact same manner as it was executed on the network. It will replay any transaction that may have been executed prior to this one before it will finally attempt to execute the transaction that corresponds to the given hash.

##### Arguments

- `transactionHash: DATA` : Hash of the transaction to trace.
- `options?: TransactionTraceOptions` : See options in source.

##### Returns

`Promise<TraceTransactionResult>` : Returns the `gas`, `structLogs`, and `returnValue` for the traced transaction. The `structLogs` are an array of logs, which contains the following fields:

- `depth`: The execution depth.
- `error`: Information about an error, if one occurred.
- `gas`: The number of gas remaining.
- `gasCost`: The cost of gas in wei.
- `memory`: An array containing the contract's memory data.
- `op`: The current opcode.
- `pc`: The current program counter.
- `stack`: The EVM execution stack.
- `storage`: An object containing the contract's storage data.

---

#### eth_accounts

Returns a list of addresses owned by client.

##### Returns

`Promise<string[]>` : Array of 20 Bytes - addresses owned by the client.

---

#### eth_blockNumber

Returns the number of the most recent block.

##### Returns

`Promise<QUANTITY>` : The current block number the client is on.

---

#### eth_call

Executes a new message call immediately without creating a transaction on the block chain.

##### Arguments

- `transaction: any` : The transaction call object as seen in source.
- `blockNumber: QUANTITY | TAG` : Integer block number, or the string "latest", "earliest" or "pending".

##### Returns

`Promise<DATA>` : The return value of executed contract.

---

#### eth_chainId

Returns the currently configured chain id, a value used in replay-protected transaction signing as introduced by EIP-155.

##### Returns

`Promise<QUANTITY>` : The chain id as a string.

---

#### eth_coinbase

Returns the client coinbase address.

##### Returns

`Promise<Address>` : The current coinbase address.

---

#### eth_estimateGas

Generates and returns an estimate of how much gas is necessary to allow the transaction to complete. The transaction will not be added to the blockchain. Note that the estimate may be significantly more than the amount of gas actually used by the transaction, for a variety of reasons including EVM mechanics and node performance.

##### Arguments

- `transaction: TypedRpcTransaction` : The transaction call object as seen in source.
- `blockNumber: QUANTITY | TAG` : Integer block number, or the string "latest", "earliest" or "pending".

##### Returns

`Promise<QUANTITY>` : The amount of gas used.

---

#### eth_gasPrice

Returns the current price per gas in wei.

##### Returns

`Promise<QUANTITY>` : Integer of the current gas price in wei.

---

#### eth_getBalance

Returns the balance of the account of given address.

##### Arguments

- `address: DATA` : Address to check for balance.
- `blockNumber: QUANTITY | TAG` : Integer block number, or the string "latest", "earliest" or "pending".

##### Returns

`Promise<QUANTITY>` : Integer of the account balance in wei.

---

#### eth_getBlockByHash

Returns information about a block by block hash.

##### Arguments

- `hash: DATA` : Hash of a block.
- `transactions: boolean` : If `true` it returns the full transaction objects, if `false` only the hashes of the transactions.

##### Returns

`Promise<object>` : The block, `null` if the block doesn't exist.

---

#### eth_getBlockByNumber

Returns information about a block by block number.

##### Arguments

- `number: QUANTITY | TAG` : Integer of a block number, or the string "earliest", "latest" or "pending", as in the default block parameter.
- `transactions: boolean` : If `true` it returns the full transaction objects, if `false` only the hashes of the transactions.

##### Returns

`Promise<object>` : The block, `null` if the block doesn't exist.

---

#### eth_getBlockTransactionCountByHash

Returns the number of transactions in a block from a block matching the given block hash.

##### Arguments

- `hash: DATA` : Hash of a block.

##### Returns

`Promise<QUANTITY>` : Number of transactions in the block.

---

#### eth_getBlockTransactionCountByNumber

Returns the number of transactions in a block from a block matching the given block number.

##### Arguments

- `blockNumber: QUANTITY | TAG`

##### Returns

`Promise<QUANTITY>` : Integer of the number of transactions in the block.

---

#### eth_getCode

Returns code at a given address.

##### Arguments

- `address: DATA` : Address.
- `blockNumber: QUANTITY | TAG` : Integer block number, or the string "latest", "earliest" or "pending".

##### Returns

`Promise<DATA>` : The code from the given address.

---

#### eth_getCompilers

Returns a list of available compilers.

##### Returns

`Promise<string[]>` : List of available compilers.

---

#### eth_getFilterChanges

Polling method for a filter, which returns an array of logs, block hashes, or transaction hashes, depending on the filter type, which occurred since last poll.

##### Arguments

- `filterId: QUANTITY` : The filter id.

##### Returns

`Promise<DATA[]>` : An array of logs, block hashes, or transaction hashes, depending on the filter type, which occurred since last poll. For filters created with `eth_newBlockFilter` the return are block hashes (`DATA`, 32 Bytes). For filters created with `eth_newPendingTransactionFilter` the return are transaction hashes (`DATA`, 32 Bytes). For filters created with `eth_newFilter` the return are log objects with the following parameters:

- `removed`: `TAG` - `true` when the log was removed, `false` if its a valid log.
- `logIndex`: `QUANTITY` - Integer of the log index position in the block. `null` when pending.
- `transactionIndex`: `QUANTITY` - Integer of the transactions index position. `null` when pending.
- `transactionHash`: `DATA`, 32 Bytes - Hash of the transaction where the log was. `null` when pending.
- `blockHash`: `DATA`, 32 Bytes - Hash of the block where the log was. `null` when pending.
- `blockNumber`: `QUANTITY` - The block number where the log was in. `null` when pending.
- `address`: `DATA`, 20 Bytes - The address from which the log originated.
- `data`: `DATA` - Contains one or more 32 Bytes non-indexed arguments of the log.
- `topics`: `Array of DATA` - Array of 0 to 4 32 Bytes `DATA` of indexed log arguments.

---

#### eth_getFilterLogs

Returns an array of all logs matching filter with given id.

##### Arguments

- `filterId: QUANTITY` : The filter id.

##### Returns

`Promise<object[]>` : Array of log objects, or an empty array.

---

#### eth_getLogs

Returns an array of all logs matching a given filter object.

##### Arguments

- `filter: FilterArgs` : The filter options as seen in source.

##### Returns

`Promise<object[]>` : Array of log objects, or an empty array.

---

#### eth_getStorageAt

Returns the value from a storage position at a given address.

##### Arguments

- `address: DATA` : Address of the storage.
- `position: QUANTITY` : Integer of the position in the storage.
- `blockNumber: QUANTITY | TAG` : Integer block number, or the string "latest", "earliest" or "pending".

##### Returns

`Promise<DATA>` : The value in storage at the requested position.

---

#### eth_getTransactionByBlockHashAndIndex

Returns information about a transaction by block hash and transaction index position.

##### Arguments

- `hash: DATA` : Hash of a block.
- `index: QUANTITY` : Integer of the transaction index position.

##### Returns

`Promise<object>` : The transaction object or `null` if no transaction was found.

---

#### eth_getTransactionByBlockNumberAndIndex

Returns information about a transaction by block number and transaction index position.

##### Arguments

- `number: QUANTITY | TAG` : A block number, or the string "earliest", "latest" or "pending".
- `index: QUANTITY` : Integer of the transaction index position.

##### Returns

`Promise<object>` : The transaction object or `null` if no transaction was found.

---

#### eth_getTransactionByHash

Returns the information about a transaction requested by transaction hash.

##### Arguments

- `transactionHash: DATA` : Hash of a transaction.

##### Returns

`Promise<object>` : The transaction object or `null` if no transaction was found.

---

#### eth_getTransactionCount

Returns the number of transactions sent from an address.

##### Arguments

- `address: DATA` : `DATA`, 20 Bytes - The address to get number of transactions sent from
- `blockNumber: QUANTITY | TAG` : Integer block number, or the string "latest", "earliest" or "pending".

##### Returns

`Promise<QUANTITY>` : Number of transactions sent from this address.

---

#### eth_getTransactionReceipt

Returns the receipt of a transaction by transaction hash.

##### Arguments

- `transactionHash: DATA` : Hash of a transaction.

##### Returns

`Promise<TransactionReceiptJSON>` : Returns the receipt of a transaction by transaction hash.

---

#### eth_getUncleByBlockHashAndIndex

Returns information about a uncle of a block by hash and uncle index position.

##### Arguments

- `hash: DATA` : Hash of a block.
- `index: QUANTITY` : The uncle's index position.

##### Returns

`Promise<object>` : A block object or `null` when no block is found.

---

#### eth_getUncleByBlockNumberAndIndex

Returns information about a uncle of a block by hash and uncle index position.

##### Arguments

- `blockNumber: QUANTITY | TAG` : A block number, or the string "earliest", "latest" or "pending".
- `uncleIndex: QUANTITY` : The uncle's index position.

##### Returns

`Promise<object>` : A block object or `null` when no block is found.

---

#### eth_getUncleCountByBlockHash

Returns the number of uncles in a block from a block matching the given block hash.

##### Arguments

- `hash: DATA` : Hash of a block.

##### Returns

`Promise<QUANTITY>` : The number of uncles in a block.

---

#### eth_getUncleCountByBlockNumber

Returns the number of uncles in a block from a block matching the given block hash.

##### Arguments

- `blockNumber: QUANTITY | TAG` : A block number, or the string "earliest", "latest" or "pending".

##### Returns

`Promise<QUANTITY>` : The number of uncles in a block.

---

#### eth_getWork

Returns: An Array with the following elements:

1. `DATA`, 32 Bytes - current block header pow-hash
2. `DATA`, 32 Bytes - the seed hash used for the DAG.
3. `DATA`, 32 Bytes - the boundary condition ("target"), 2^256 / difficulty.

##### Arguments

- `filterId: QUANTITY` : A filter id.

##### Returns

`Promise<[] | [string, string, string]>` : The hash of the current block, the seedHash, and the boundary condition to be met ("target").

---

#### eth_hashrate

Returns the number of hashes per second that the node is mining with.

##### Returns

`Promise<QUANTITY>` : Number of hashes per second.

---

#### eth_maxPriorityFeePerGas

Returns a `maxPriorityFeePerGas` value suitable for quick transaction inclusion.

##### Returns

`Promise<QUANTITY>` : The maxPriorityFeePerGas in wei.

---

#### eth_mining

Returns `true` if client is actively mining new blocks.

##### Returns

`Promise<boolean>` : returns `true` if the client is mining, otherwise `false`.

---

#### eth_newBlockFilter

Creates a filter in the node, to notify when a new block arrives. To check if the state has changed, call `eth_getFilterChanges`.

##### Returns

`Promise<QUANTITY>` : A filter id.

---

#### eth_newFilter

Creates a filter object, based on filter options, to notify when the state changes (logs). To check if the state has changed, call `eth_getFilterChanges`.

##### Arguments

- `filter?: RangeFilterArgs` : The filter options as seen in source.

##### Returns

`Promise<QUANTITY>` : A filter id.

---

#### eth_newPendingTransactionFilter

Creates a filter in the node, to notify when new pending transactions arrive. To check if the state has changed, call `eth_getFilterChanges`.

##### Returns

`Promise<QUANTITY>` : A filter id.

---

#### eth_protocolVersion

Returns the current ethereum protocol version.

##### Returns

`Promise<DATA>` : The current ethereum protocol version.

---

#### eth_sendRawTransaction

Creates new message call transaction or a contract creation for signed transactions.

##### Arguments

- `transaction: string` : The signed transaction data.

##### Returns

`Promise<DATA>` : The transaction hash.

---

#### eth_sendTransaction

Creates new message call transaction or a contract creation, if the data field contains code.

##### Arguments

- `transaction: TypedRpcTransaction` : The transaction call object as seen in source.

##### Returns

`Promise<DATA>` : The transaction hash.

---

#### eth_sign

The sign method calculates an Ethereum specific signature with: `sign(keccak256("\x19Ethereum Signed Message:\n" + message.length + message)))`.

##### Arguments

- `address: DATA` : Address to sign with.
- `message: DATA` : Message to sign.

##### Returns

`Promise<string>` : Signature - a hex encoded 129 byte array starting with `0x`. It encodes the `r`, `s`, and `v` parameters from appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf) in big-endian format. Bytes 0...64 contain the `r` parameter, bytes 64...128 the `s` parameter, and the last byte the `v` parameter. Note that the `v` parameter includes the chain id as specified in [EIP-155](https://eips.ethereum.org/EIPS/eip-155).

---

#### eth_signTransaction

Signs a transaction that can be submitted to the network at a later time using `eth_sendRawTransaction`.

##### Arguments

- `transaction: TypedRpcTransaction` : The transaction call object as seen in source.

##### Returns

`Promise<string>` : The raw, signed transaction.

---

#### eth_signTypedData

Identical to eth_signTypedData_v4.

##### Arguments

- `address: DATA` : Address of the account that will sign the messages.
- `typedData: TypedData` : Typed structured data to be signed.

##### Returns

`Promise<string>` : Signature. As in `eth_sign`, it is a hex encoded 129 byte array starting with `0x`. It encodes the `r`, `s`, and `v` parameters from appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf) in big-endian format. Bytes 0...64 contain the `r` parameter, bytes 64...128 the `s` parameter, and the last byte the `v` parameter. Note that the `v` parameter includes the chain id as specified in [EIP-155](https://eips.ethereum.org/EIPS/eip-155).

---

#### eth_signTypedData_v4

##### Arguments

- `address: DATA` : Address of the account that will sign the messages.
- `typedData: TypedData` : Typed structured data to be signed.

##### Returns

`Promise<string>` : Signature. As in `eth_sign`, it is a hex encoded 129 byte array starting with `0x`. It encodes the `r`, `s`, and `v` parameters from appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf) in big-endian format. Bytes 0...64 contain the `r` parameter, bytes 64...128 the `s` parameter, and the last byte the `v` parameter. Note that the `v` parameter includes the chain id as specified in [EIP-155](https://eips.ethereum.org/EIPS/eip-155).

---

#### eth_submitHashrate

Used for submitting mining hashrate.

##### Arguments

- `hashRate: DATA` : A hexadecimal string representation (32 bytes) of the hash rate.
- `clientID: DATA` : A random hexadecimal(32 bytes) ID identifying the client.

##### Returns

`Promise<boolean>` : `true` if submitting went through succesfully and `false` otherwise.

---

#### eth_submitWork

Used for submitting a proof-of-work solution.

##### Arguments

- `nonce: DATA` : The nonce found (64 bits).
- `powHash: DATA` : The header's pow-hash (256 bits).
- `digest: DATA` : The mix digest (256 bits).

##### Returns

`Promise<boolean>` : `true` if the provided solution is valid, otherwise `false`.

---

#### eth_subscribe

Starts a subscription to a particular event. For every event that matches the subscription a JSON-RPC notification with event details and subscription ID will be sent to a client.

##### Arguments

- `subscriptionName: SubscriptionName` : Name for the subscription.

##### Returns

`PromiEvent<QUANTITY>` : A subscription id.

---

#### eth_syncing

Returns an object containing data about the sync status or `false` when not syncing.

##### Returns

`Promise<object>` : An object with sync status data or `false`, when not syncing.

---

#### eth_uninstallFilter

Uninstalls a filter with given id. Should always be called when watch is no longer needed.

##### Arguments

- `filterId: QUANTITY` : The filter id.

##### Returns

`Promise<boolean>` : `true` if the filter was successfully uninstalled, otherwise `false`.

---

#### eth_unsubscribe

Cancel a subscription to a particular event. Returns a boolean indicating if the subscription was successfully cancelled.

##### Arguments

- `subscriptionId: SubscriptionId` : The ID of the subscription to unsubscribe to.

##### Returns

`Promise<boolean>` : `true` if subscription was cancelled successfully, otherwise `false`.

---

#### evm_addAccount

Adds any arbitrary account to the `personal` namespace.

##### Arguments

- `address: DATA` : The address of the account to add to the `personal` namespace.
- `passphrase: string` : The passphrase used to encrypt the account's private key. NOTE: this passphrase will be needed for all `personal` namespace calls that require a password.

##### Returns

`Promise<boolean>` : `true` if the account was successfully added. `false` if the account is already in the `personal` namespace.

---

#### evm_increaseTime

Jump forward in time by the given amount of time, in seconds.

##### Arguments

- `seconds: number | QUANTITY` : Number of seconds to jump forward in time by. Must be greater than or equal to `0`.

##### Returns

`Promise<number>` : Returns the total time adjustment, in seconds.

---

#### evm_mine

Force a single block to be mined.

##### Arguments

- `timestamp: number` : the timestamp the block should be mined with. EXPERIMENTAL: Optionally, specify an `options` object with `timestamp` and/or `blocks` fields. If `blocks` is given, it will mine exactly `blocks` number of blocks, regardless of any other blocks mined or reverted during it's operation. This behavior is subject to change!

##### Returns

`Promise<"0x0">` : The string `"0x0"`. May return additional meta-data in the future.

---

#### evm_removeAccount

Removes an account from the `personal` namespace.

##### Arguments

- `address: DATA` : The address of the account to remove from the `personal` namespace.
- `passphrase: string` : The passphrase used to decrypt the account's private key.

##### Returns

`Promise<boolean>` : `true` if the account was successfully removed. `false` if the account was not in the `personal` namespace.

---

#### evm_revert

Revert the state of the blockchain to a previous snapshot. Takes a single parameter, which is the snapshot id to revert to. This deletes the given snapshot, as well as any snapshots taken after (e.g.: reverting to id 0x1 will delete snapshots with ids 0x1, 0x2, etc.)

##### Arguments

- `snapshotId: QUANTITY` : The snapshot id to revert.

##### Returns

`Promise<boolean>` : `true` if a snapshot was reverted, otherwise `false`.

---

#### evm_setAccountNonce

Sets the given account's nonce to the specified value. Mines a new block before returning.

##### Arguments

- `address: DATA` : The account address to update.
- `nonce: QUANTITY` : The nonce value to be set.

##### Returns

`Promise<boolean>` : `true` if it worked, otherwise `false`.

---

#### evm_setTime

Sets the internal clock time to the given timestamp.

##### Arguments

- `time: number | QUANTITY | Date` : JavaScript timestamp (millisecond precision).

##### Returns

`Promise<number>` : The amount of _seconds_ between the given timestamp and now.

---

#### evm_snapshot

Snapshot the state of the blockchain at the current block. Takes no parameters. Returns the id of the snapshot that was created. A snapshot can only be reverted once. After a successful `evm_revert`, the same snapshot id cannot be used again. Consider creating a new snapshot after each `evm_revert` if you need to revert to the same point multiple times.

##### Returns

`Promise<QUANTITY>` : The hex-encoded identifier for this snapshot.

---

#### miner_setEtherbase

Sets the etherbase, where mining rewards will go.

##### Arguments

- `address: DATA` : The address where the mining rewards will go.

##### Returns

`Promise<boolean>` : `true`.

---

#### miner_setExtra

Set the extraData block header field a miner can include.

##### Arguments

- `extra: DATA` : The `extraData` to include.

##### Returns

`Promise<boolean>` : If successfully set returns `true`, otherwise returns an error.

---

#### miner_setGasPrice

Sets the default accepted gas price when mining transactions. Any transactions that don't specify a gas price will use this amount. Transactions that are below this limit are excluded from the mining process.

##### Arguments

- `number: QUANTITY` : Default accepted gas price.

##### Returns

`Promise<boolean>` : `true`.

---

#### miner_start

Resume the CPU mining process with the given number of threads.

##### Arguments

- `threads: number` : Number of threads to resume the CPU mining process with.

##### Returns

`Promise<boolean>` : `true`.

---

#### miner_stop

Stop the CPU mining operation.

##### Returns

`Promise<boolean>` : `true`.

---

#### net_listening

Returns `true` if client is actively listening for network connections.

##### Returns

`Promise<boolean>` : `true` when listening, otherwise `false`.

---

#### net_peerCount

Returns number of peers currently connected to the client.

##### Returns

`Promise<QUANTITY>` : Number of connected peers.

---

#### net_version

Returns the current network id.

##### Returns

`Promise<string>` : The current network id. This value should NOT be JSON-RPC Quantity/Data encoded.

---

#### personal_importRawKey

Imports the given unencrypted private key (hex string) into the key store, encrypting it with the passphrase.

##### Arguments

- `rawKey: DATA` : The raw, unencrypted private key to import.
- `passphrase: string` : The passphrase to encrypt with.

##### Returns

`Promise<Address>` : Returns the address of the new account.

---

#### personal_listAccounts

Returns all the Ethereum account addresses of all keys that have been added.

##### Returns

`Promise<string[]>` : The Ethereum account addresses of all keys that have been added.

---

#### personal_lockAccount

Locks the account. The account can no longer be used to send transactions.

##### Arguments

- `address: DATA` : The account address to be locked.

##### Returns

`Promise<boolean>` : Returns `true` if the account was locked, otherwise `false`.

---

#### personal_newAccount

Generates a new account with private key. Returns the address of the new account.

##### Arguments

- `passphrase: string` : The passphrase to encrypt the private key with.

##### Returns

`Promise<Address>` : The new account's address.

---

#### personal_sendTransaction

Validate the given passphrase and submit transaction.

##### Arguments

- `transaction: TypedRpcTransaction`
- `passphrase: string` : The passphrase to decrpyt the private key belonging to `tx.from`.

##### Returns

`Promise<DATA>` : The transaction hash or if unsuccessful an error.

---

#### personal_signTransaction

Validates the given passphrase and signs a transaction that can be submitted to the network at a later time using `eth_sendRawTransaction`.

##### Arguments

- `transaction: TypedRpcTransaction` : The transaction call object as seen in source.
- `passphrase: string`

##### Returns

`Promise<string>` : The raw, signed transaction.

---

#### personal_unlockAccount

Unlocks the account for use.

##### Arguments

- `address: DATA` : 20 Bytes - The address of the account to unlock.
- `passphrase: string` : Passphrase to unlock the account.
- `duration: number` : (default: 300) Duration in seconds how long the account should remain unlocked for. Set to 0 to disable automatic locking.

##### Returns

`Promise<boolean>` : `true` if it worked. Throws an error or returns `false` if it did not.

---

#### rpc_modules

Returns object of RPC modules.

##### Returns

`Promise<object>` : RPC modules.

---

#### shh_addToGroup

Adds a whisper identity to the group.

##### Arguments

- `address: DATA` : The identity address to add to a group.

##### Returns

`Promise<boolean>` : `true` if the identity was successfully added to the group, otherwise `false`.

---

#### shh_getFilterChanges

Polling method for whisper filters. Returns new messages since the last call of this method.

##### Arguments

- `id: QUANTITY` : The filter id. Ex: "0x7"

##### Returns

`Promise<any[]>` : More Info: https://github.com/ethereum/wiki/wiki/JSON-RPC#shh\_getfilterchanges

---

#### shh_getMessages

Get all messages matching a filter. Unlike shh_getFilterChanges this returns all messages.

##### Arguments

- `id: QUANTITY` : The filter id. Ex: "0x7"

##### Returns

`Promise<boolean>` : See: `shh_getFilterChanges`.

---

#### shh_hasIdentity

Checks if the client hold the private keys for a given identity.

##### Arguments

- `address: DATA` : The identity address to check.

##### Returns

`Promise<boolean>` : Returns `true` if the client holds the private key for that identity, otherwise `false`.

---

#### shh_newFilter

Creates filter to notify, when client receives whisper message matching the filter options.

##### Arguments

- `to: DATA` : (optional) Identity of the receiver. When present it will try to decrypt any incoming message if the client holds the private key to this identity.
- `topics: DATA[]` : Array of topics which the incoming message's topics should match.

##### Returns

`Promise<boolean>` : Returns `true` if the identity was successfully added to the group, otherwise `false`.

---

#### shh_newGroup

Creates a new group.

##### Returns

`Promise<string>` : The address of the new group.

---

#### shh_newIdentity

Creates new whisper identity in the client.

##### Returns

`Promise<string>` : - The address of the new identity.

---

#### shh_post

Creates a whisper message and injects it into the network for distribution.

##### Arguments

- `postData: WhisperPostObject`

##### Returns

`Promise<boolean>` : Returns `true` if the message was sent, otherwise `false`.

---

#### shh_uninstallFilter

Uninstalls a filter with given id. Should always be called when watch is no longer needed. Additionally filters timeout when they aren't requested with `shh_getFilterChanges` for a period of time.

##### Arguments

- `id: QUANTITY` : The filter id. Ex: "0x7"

##### Returns

`Promise<boolean>` : `true` if the filter was successfully uninstalled, otherwise `false`.

---

#### shh_version

Returns the current whisper protocol version.

##### Returns

`Promise<string>` : The current whisper protocol version.

---

#### web3_clientVersion

Returns the current client version.

##### Returns

`Promise<string>` : The current client version.

---

#### web3_sha3

Returns Keccak-256 (not the standardized SHA3-256) of the given data.

##### Arguments

- `data: DATA` : the data to convert into a SHA3 hash.

##### Returns

`Promise<DATA>` : The SHA3 result of the given string.

---

### Ganache Provider Events

In addition to [EIP-1193's](https://eips.ethereum.org/EIPS/eip-1193) `"message"` event and the legacy `"data"` event, Ganache emits 3 additional events: `"ganache:vm:tx:before"`, `"ganache:vm:tx:step"`, and `"ganache:vm:tx:after"`.

These events can be used to observe the lifecycle of any transaction executed via `*sendTransaction`, `eth_call`, `debug_traceTransaction`, or `debug_storageRangeAt`.

These share the [event paradigm that Truffle uses](https://www.trufflesuite.com/docs/truffle/advanced/event-system#how-to-define-your-event-handlers), but without any of the wildcard handling, i.e., no `"vm:*"` support (for now).

Each of these events will emit a `context` object which is a unique object that can be used to identify a transaction over the course of its lifecycle. For example:

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

The reason this `context` is necessary is that Ganache may run multiple transactions simultaneously, so `"ganache:vm:tx:step"` events from different transactions could be intermingled.

The above events will be emitted for `eth_call`, `*sendTransaction`, `debug_traceTransaction`, and `debug_storageRangeAt`.

Currently, we do not await the event listener's return value, however, we'll likely enable this in the future.

## Community

- [Discord](https://trfl.io/community)
- [Reddit](https://www.reddit.com/r/Truffle/)

## Contributing

See [CONTRIBUTING.md](https://github.com/trufflesuite/ganache/blob/develop/CONTRIBUTING.md) for our guide to contributing to Ganache.

## Related

- [Truffle](https://www.github.com/trufflesuite/truffle)
- [Drizzle](https://www.github.com/trufflesuite/drizzle)

<br/>

---

<h4 align="center">
  <a href="https://www.trufflesuite.com" title="Brought to you by Truffle"><img alt="Truffle" src="https://trufflesuite.github.io/ganache/assets/img/truffle-logo-dark.svg" width="60"/></a>
</h4>
