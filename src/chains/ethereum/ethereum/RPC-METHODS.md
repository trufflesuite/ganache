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

`Promise<Ethereum.StorageRangeResult>` : Returns a storage object with the keys being keccak-256 hashes of the storage keys, and the values being the raw, unhashed key and value for that specific storage slot. Also returns a next key which is the keccak-256 hash of the next key in storage for continuous downloading.

---

#### debug_traceTransaction

Attempt to run the transaction in the exact same manner as it was executed on the network. It will replay any transaction that may have been executed prior to this one before it will finally attempt to execute the transaction that corresponds to the given hash.

##### Arguments

- `transactionHash: DATA` : Hash of the transaction to trace.
- `options?: Ethereum.TransactionTraceOptions` : See options in source.

##### Returns

`Promise<Ethereum.TraceTransactionResult>` : Returns the `gas`, `structLogs`, and `returnValue` for the traced transaction. The `structLogs` are an array of logs, which contains the following fields:

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
- `overrides: CallOverrides`: State overrides to apply during the simulation.

  - `CallOverrides` - An address-to-state mapping, where each entry specifies some
    state to be ephemerally overridden prior to executing the call. Each address maps to an object containing: - `balance: QUANTITY` (optional) - The balance to set for the account before executing the call. - `nonce: QUANTITY` (optional) - The nonce to set for the account before executing the call. - `code: DATA` (optional) - The EVM bytecode to set for the account before executing the call. - `state: OBJECT` (optional\*) - Key-value mapping to override _all_ slots in the account storage before executing the call. - `stateDiff: OBJECT` (optional\*) - Key-value mapping to override _individual_ slots in the account storage before executing the call.

        _\*Note - `state` and `stateDiff` fields are mutually exclusive._

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

- `transaction: Ethereum.Transaction` : The transaction call object as seen in source.
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

`Promise<Ethereum.Block<IncludeTransactions>>` : The block, `null` if the block doesn't exist.

---

#### eth_getBlockByNumber

Returns information about a block by block number.

##### Arguments

- `number: QUANTITY | TAG` : Integer of a block number, or the string "earliest", "latest" or "pending", as in the default block parameter.
- `transactions: boolean` : If `true` it returns the full transaction objects, if `false` only the hashes of the transactions.

##### Returns

`Promise<Ethereum.Block<IncludeTransactions>>` : The block, `null` if the block doesn't exist.

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

- `filter: Ethereum.LogsFilter` : The filter options as seen in source.

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

`Promise<Ethereum.TransactionReceipt>` : Returns the receipt of a transaction by transaction hash.

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

- `filter?: Ethereum.Filter` : The filter options as seen in source.

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

- `transaction: Ethereum.Transaction` : The transaction call object as seen in source.

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

- `transaction: Ethereum.Transaction` : The transaction call object as seen in source.

##### Returns

`Promise<string>` : The raw, signed transaction.

---

#### eth_signTypedData

Identical to eth_signTypedData_v4.

##### Arguments

- `address: DATA` : Address of the account that will sign the messages.
- `typedData: Ethereum.TypedData` : Typed structured data to be signed.

##### Returns

`Promise<string>` : Signature. As in `eth_sign`, it is a hex encoded 129 byte array starting with `0x`. It encodes the `r`, `s`, and `v` parameters from appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf) in big-endian format. Bytes 0...64 contain the `r` parameter, bytes 64...128 the `s` parameter, and the last byte the `v` parameter. Note that the `v` parameter includes the chain id as specified in [EIP-155](https://eips.ethereum.org/EIPS/eip-155).

---

#### eth_signTypedData_v4

##### Arguments

- `address: DATA` : Address of the account that will sign the messages.
- `typedData: Ethereum.TypedData` : Typed structured data to be signed.

##### Returns

`Promise<string>` : Signature. As in `eth_sign`, it is a hex encoded 129 byte array starting with `0x`. It encodes the `r`, `s`, and `v` parameters from appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf) in big-endian format. Bytes 0...64 contain the `r` parameter, bytes 64...128 the `s` parameter, and the last byte the `v` parameter. Note that the `v` parameter includes the chain id as specified in [EIP-155\](https://eips.ethereum.org/EIPS/eip-155).

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

- `subscriptionName: Ethereum.SubscriptionName` : Name for the subscription.

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

- `subscriptionId: Ethereum.SubscriptionId` : The ID of the subscription to unsubscribe to.

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

#### evm_setAccountBalance

Sets the given account's balance to the specified WEI value. Mines a new block before returning.

##### Arguments

- `address: DATA` : The account address to update.
- `balance: QUANTITY` : The balance value, in WEI, to be set.

##### Returns

`Promise<boolean>` : `true` if it worked, otherwise `false`.

---

#### evm_setAccountCode

Sets the given account's code to the specified value. Mines a new block before returning.

##### Arguments

- `address: DATA` : The account address to update.
- `code: DATA` : The code to be set.

##### Returns

`Promise<boolean>` : `true` if it worked, otherwise `false`.

---

#### evm_setAccountStorageAt

Sets the given account's storage slot to the specified data. Mines a new block before returning.

##### Arguments

- `address: DATA` : The account address to update.
- `slot: DATA` : The storage slot that should be set.
- `value: DATA` : The value to be set.

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

- `transaction: Ethereum.Transaction`
- `passphrase: string` : The passphrase to decrypt the private key belonging to `tx.from`.

##### Returns

`Promise<DATA>` : The transaction hash or if unsuccessful an error.

---

#### personal_signTransaction

Validates the given passphrase and signs a transaction that can be submitted to the network at a later time using `eth_sendRawTransaction`.

##### Arguments

- `transaction: Ethereum.Transaction` : The transaction call object as seen in source.
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

- `postData: Ethereum.WhisperPostObject`

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

#### txpool_content()

Returns the current content of the transaction pool.

##### Returns

`Promise<Ethereum.Pool.Content>` : The transactions currently pending or queued in the transaction pool.

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
