//#region Imports
import {
  RuntimeBlock,
  Block,
  Tag,
  Address,
  Transaction,
  BlockLogs,
  Account,
  VM_EXCEPTION,
  VM_EXCEPTIONS,
  CodedError,
  ErrorCodes,
  WhisperPostObject,
  BaseFilterArgs,
  Filter,
  FilterArgs,
  FilterTypes,
  RangeFilterArgs,
  SubscriptionId,
  SubscriptionName
} from "@ganache/ethereum-utils";
import {
  toRpcSig,
  KECCAK256_NULL,
  ecsign,
  hashPersonalMessage
} from "ethereumjs-util";
import { TypedData as NotTypedData, signTypedData_v4 } from "eth-sig-util";
import { EthereumInternalOptions, Hardfork } from "@ganache/ethereum-options";
import { types, Data, Quantity, PromiEvent, utils } from "@ganache/utils";
import Blockchain, {
  SimulationOverrides,
  TransactionTraceOptions
} from "./blockchain";
import Wallet from "./wallet";
import { decode as rlpDecode } from "rlp";
import { $INLINE_JSON } from "ts-transformer-inline-file";

import Emittery from "emittery";
import Common from "ethereumjs-common";
import EthereumAccount from "ethereumjs-account";
import estimateGas from "./helpers/gas-estimator";
import { assertArgLength } from "./helpers/assert-arg-length";
import {
  parseFilter,
  parseFilterDetails,
  parseFilterRange
} from "./helpers/filter-parsing";

// Read in the current ganache version from core's package.json
const { version } = $INLINE_JSON("../../../../packages/ganache/package.json");
const { keccak } = utils;
//#endregion

//#region Constants
const { RPCQUANTITY_ZERO } = utils;
const CLIENT_VERSION = `Ganache/v${version}/EthereumJS TestRPC/v${version}/ethereum-js`;
const PROTOCOL_VERSION = Data.from("0x3f");
const RPC_MODULES = {
  eth: "1.0",
  net: "1.0",
  rpc: "1.0",
  web3: "1.0",
  evm: "1.0",
  personal: "1.0"
} as const;
const KNOWN_CHAINIDS = new Set([1, 3, 4, 5, 42]);
//#endregion

//#region misc types
type TypedData = Exclude<
  Parameters<typeof signTypedData_v4>[1]["data"],
  NotTypedData
>;
//#endregion

//#region helpers
function assertExceptionalTransactions(transactions: Transaction[]) {
  let baseError: string = null;
  let errors: string[];
  const data = {};

  transactions.forEach(transaction => {
    if (transaction.execException) {
      if (baseError) {
        baseError = VM_EXCEPTIONS;
        errors.push(
          `${Data.from(transaction.hash(), 32).toString()}: ${
            transaction.execException
          }\n`
        );
        data[transaction.execException.data.hash] =
          transaction.execException.data;
      } else {
        baseError = VM_EXCEPTION;
        errors = [transaction.execException.message];
        data[transaction.execException.data.hash] =
          transaction.execException.data;
      }
    }
  });

  if (baseError) {
    const err = new Error(baseError + errors.join("\n"));
    (err as any).data = data;
    throw err;
  }
}

function parseCoinbaseAddress(
  coinbase: string | number | Address,
  initialAccounts: Account[]
) {
  switch (typeof coinbase) {
    case "object":
      return coinbase;
    case "number":
      const account = initialAccounts[coinbase];
      if (account) {
        return account.address;
      } else {
        throw new Error(`invalid coinbase address index: ${coinbase}`);
      }
    case "string":
      return Address.from(coinbase);
    default: {
      throw new Error(
        `coinbase address must be string or number, received: ${coinbase}`
      );
    }
  }
}

function createCommon(chainId: number, networkId: number, hardfork: Hardfork) {
  return Common.forCustomChain(
    // if we were given a chain id that matches a real chain, use it
    // NOTE: I don't think Common serves a purpose ther than instructing the
    // VM what hardfork is in use. But just incase things change in the future
    // its configured "more correctly" here.
    KNOWN_CHAINIDS.has(chainId) ? chainId : 1,
    {
      name: "ganache",
      networkId: networkId,
      chainId: chainId,
      comment: "Local test network"
    },
    hardfork
  );
}
//#endregion helpers

export default class EthereumApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  readonly #getId = (id => () => Quantity.from(++id))(0);
  readonly #common: Common;
  readonly #filters = new Map<string, Filter>();
  readonly #subscriptions = new Map<string, Emittery.UnsubscribeFn>();
  readonly #blockchain: Blockchain;
  readonly #options: EthereumInternalOptions;
  readonly #wallet: Wallet;

  /**
   * This is the Ethereum API that the provider interacts with.
   * The only methods permitted on the prototype are the supported json-rpc
   * methods.
   * @param options
   * @param ready Callback for when the API is fully initialized
   */
  constructor(
    options: EthereumInternalOptions,
    wallet: Wallet,
    emitter: Emittery.Typed<{ message: any }, "connect" | "disconnect">
  ) {
    this.#options = options;

    const { chain } = options;
    const { initialAccounts } = (this.#wallet = wallet);
    const coinbaseAddress = parseCoinbaseAddress(
      options.miner.coinbase,
      initialAccounts
    );
    const common = (this.#common = createCommon(
      chain.chainId,
      chain.networkId,
      chain.hardfork
    ));

    const blockchain = (this.#blockchain = new Blockchain(
      options,
      common,
      coinbaseAddress
    ));
    emitter.on("disconnect", blockchain.stop.bind(blockchain));
  }

  async initialize() {
    await this.#blockchain.initialize(this.#wallet.initialAccounts);
  }

  //#region db
  /**
   * Stores a string in the local database.
   *
   * @param {String} dbName - Database name.
   * @param {String} key - Key name.
   * @param {String} value - String to store.
   * @returns returns true if the value was stored, otherwise false.
   */
  @assertArgLength(3)
  async db_putString(dbName: string, key: string, value: string) {
    return false;
  }

  /**
   * Returns string from the local database
   *
   * @param {String} dbName - Database name.
   * @param {String} key - Key name.
   * @returns The previously stored string.
   */
  @assertArgLength(2)
  async db_getString(dbName: string, key: string) {
    return "";
  }

  /**
   * Stores binary data in the local database.
   *
   * @param {String} dbName - Database name.
   * @param {String} key - Key name.
   * @param {DATA} data - Data to store.
   * @returns true if the value was stored, otherwise false.
   */
  @assertArgLength(3)
  async db_putHex(dbName: string, key: string, data: string) {
    return false;
  }

  /**
   * Returns binary data from the local database
   *
   * @param {String} dbName - Database name.
   * @param {String} key - Key name.
   * @returns The previously stored data.
   */
  @assertArgLength(2)
  async db_getHex(dbName: string, key: string) {
    return "0x00";
  }
  //#endregion

  //#region bzz
  @assertArgLength(0)
  async bzz_hive() {
    return [];
  }

  @assertArgLength(0)
  async bzz_info() {
    return [];
  }
  //#endregion

  //#region evm
  /**
   * Force a single block to be mined.
   *
   * Mines a block independent of whether or not mining is started or stopped.
   * Will mine an empty block if there are no available transactions to mine.
   *
   * @param timestamp the timestamp the block should be mined with.
   * EXPERIEMENTAL: Optionally, specify an `options` object with `timestamp`
   * and/or `blocks` fields. If `blocks` is given, it will mine exactly `blocks`
   *  number of blocks, regardless of any other blocks mined or reverted during it's
   * operation. This behavior is subject to change!
   *
   * @returns The string `"0x0"`. May return additional meta-data in the future.
   *
   * @example
   * ```javascript
   * await provider.send("evm_mine", Date.now());
   * ```
   *
   * @example
   * ```javascript
   * console.log("start", await provider.send("eth_blockNumber"));
   * await provider.send("evm_mine", [{blocks: 5}]); // mines 5 blocks
   * console.log("end", await provider.send("eth_blockNumber"));
   * ```
   */
  async evm_mine(timestamp?: number): Promise<"0x0">;
  async evm_mine(options?: {
    timestamp?: number;
    blocks?: number;
  }): Promise<"0x0">;
  @assertArgLength(0, 1)
  async evm_mine(
    arg?: number | { timestamp?: number; blocks?: number }
  ): Promise<"0x0"> {
    const blockchain = this.#blockchain;
    const vmErrorsOnRPCResponse = this.#options.chain.vmErrorsOnRPCResponse;
    if (typeof arg === "object") {
      let { blocks, timestamp } = arg;
      if (blocks == null) {
        blocks = 1;
      }
      // TODO(perf): add an option to mine a bunch of blocks in a batch so
      // we can save them all to the database in one go.
      // Devs like to move the blockchain forward by thousands of blocks at a
      // time and doing this would make it way faster
      for (let i = 0; i < blocks; i++) {
        const transactions = await blockchain.mine(-1, timestamp, true);
        if (vmErrorsOnRPCResponse) {
          assertExceptionalTransactions(transactions);
        }
      }
    } else {
      const transactions = await blockchain.mine(-1, arg, true);
      if (vmErrorsOnRPCResponse) {
        assertExceptionalTransactions(transactions);
      }
    }

    return "0x0";
  }

  @assertArgLength(3, 4)
  async evm_setStorageAt(
    address: string,
    position: bigint | number,
    storage: string,
    blockNumber: string | Buffer | Tag = Tag.LATEST
  ) {
    const blockProm = this.#blockchain.blocks.getRaw(blockNumber);

    const trie = this.#blockchain.trie.copy();
    const block = await blockProm;
    if (!block) throw new Error("header not found");

    const blockData = (rlpDecode(block) as unknown) as [
      [Buffer, Buffer, Buffer, Buffer /* stateRoot */] /* header */,
      Buffer[],
      Buffer[]
    ];
    const headerData = blockData[0];
    const blockStateRoot = headerData[3];
    trie.root = blockStateRoot;

    const addressDataPromise = this.#blockchain.getFromTrie(
      trie,
      Address.from(address).toBuffer()
    );

    const posBuff = Quantity.from(position).toBuffer();
    const length = posBuff.length;
    let paddedPosBuff: Buffer;
    if (length < 32) {
      // storage locations are 32 bytes wide, so we need to expand any value
      // given to 32 bytes.
      paddedPosBuff = Buffer.allocUnsafe(32).fill(0);
      posBuff.copy(paddedPosBuff, 32 - length);
    } else if (length === 32) {
      paddedPosBuff = posBuff;
    } else {
      // if the position value we're passed is > 32 bytes, truncate it. This is
      // what geth does.
      paddedPosBuff = posBuff.slice(-32);
    }

    const addressData = await addressDataPromise;
    // An address's stateRoot is stored in the 3rd rlp entry
    this.#blockchain.trie.root = ((rlpDecode(addressData) as any) as [
      Buffer /*nonce*/,
      Buffer /*amount*/,
      Buffer /*stateRoot*/,
      Buffer /*codeHash*/
    ])[2];

    return new Promise((resolve, reject) => {
      this.#blockchain.trie.put(paddedPosBuff, storage, err => {
        if (err) return reject(err);
        resolve(void 0);
      });
    });
  }

  /**
   * Sets the given account's nonce to the specified value. Mines a new block
   * before returning.
   *
   * Warning: this will result in an invalid state tree.
   *
   * @param address
   * @param nonce
   * @returns `true` if it worked
   */
  @assertArgLength(2)
  async evm_setAccountNonce(address: string, nonce: string) {
    // TODO: the effect of this function could happen during a block mine operation, which would cause all sorts of
    // issues. We need to figure out a good way of timing this.
    return new Promise<boolean>((resolve, reject) => {
      const buffer = Address.from(address).toBuffer();
      const blockchain = this.#blockchain;
      const stateManager = blockchain.vm.stateManager;
      stateManager.getAccount(
        buffer,
        (err: Error, account: EthereumAccount) => {
          if (err) {
            reject(err);
            return;
          }
          account.nonce = Quantity.from(nonce).toBuffer();
          stateManager.putAccount(buffer, account, (err: Error) => {
            if (err) {
              reject(err);
              return;
            }

            // TODO: do we need to mine a block here? The changes we're making really don't make any sense at all
            // and produce an invalid trie going forward.
            blockchain.mine(0).then(() => resolve(true), reject);
          });
        }
      );
    });
  }

  /**
   * Jump forward in time by the given amount of time, in seconds.
   * @param seconds Must be greater than or equal to `0`
   * @returns Returns the total time adjustment, in seconds.
   */
  @assertArgLength(1)
  async evm_increaseTime(seconds: number | string) {
    const milliseconds =
      (typeof seconds === "number"
        ? seconds
        : Quantity.from(seconds).toNumber()) * 1000;
    return Math.floor(this.#blockchain.increaseTime(milliseconds) / 1000);
  }

  /**
   * Sets the internal clock time to the given timestamp.
   *
   * Warning: This will allow you to move *backwards* in time, which may cause
   * new blocks to appear to be mined before old blocks. This is will result in
   * an invalid state.
   *
   * @param timestamp JavaScript timestamp (millisecond precision)
   * @returns The amount of *seconds* between the given timestamp and now.
   */
  @assertArgLength(0, 1)
  async evm_setTime(time: string | Date | number) {
    let t: number;
    switch (typeof time) {
      case "object":
        t = time.getTime();
        break;
      case "number":
        t = time;
        break;
      default:
        t = Quantity.from(time).toNumber();
        break;
    }
    return Math.floor(this.#blockchain.setTime(t) / 1000);
  }

  /**
   * Revert the state of the blockchain to a previous snapshot. Takes a single
   * parameter, which is the snapshot id to revert to. This deletes the given
   * snapshot, as well as any snapshots taken after (Ex: reverting to id 0x1
   * will delete snapshots with ids 0x1, 0x2, etc... If no snapshot id is
   * passed it will revert to the latest snapshot.
   *
   * @param snapshotId the snapshot id to revert
   * @returns `true` if a snapshot was reverted, otherwise `false`
   *
   * @example
   * ```javascript
   * const snapshotId = await provider.send("evm_snapshot");
   * const isReverted = await provider.send("evm_revert", [snapshotId]);
   * ```
   *
   * @example
   * ```javascript
   * const provider = ganache.provider();
   * const [from, to] = await provider.send("eth_accounts");
   * const startingBalance = BigInt(await provider.send("eth_getBalance", [from]));
   *
   * // take a snapshot
   * const snapshotId = await provider.send("evm_snapshot");
   *
   * // send value to another account (over-simplified example)
   * await provider.send("eth_subscribe", ["newHeads"]);
   * await provider.send("eth_sendTransaction", [{from, to, value: "0xffff"}]);
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   *
   * // ensure balance has updated
   * const newBalance = await provider.send("eth_getBalance", [from]);
   * assert(BigInt(newBalance) < startingBalance);
   *
   * // revert the snapshot
   * const isReverted = await provider.send("evm_revert", [snapshotId]);
   * assert(isReverted);
   *
   * const endingBalance = await provider.send("eth_getBalance", [from]);
   * assert.strictEqual(BigInt(endingBalance), startingBalance);
   * ```
   */
  @assertArgLength(1)
  async evm_revert(snapshotId: string | number) {
    return this.#blockchain.revert(Quantity.from(snapshotId));
  }

  /**
   * Snapshot the state of the blockchain at the current block. Takes no
   * parameters. Returns the id of the snapshot that was created. A snapshot can
   * only be reverted once. After a successful `evm_revert`, the same snapshot
   * id cannot be used again. Consider creating a new snapshot after each
   * `evm_revert` if you need to revert to the same point multiple times.
   *
   * @returns The hex-encoded identifier for this snapshot
   *
   * @example
   * ```javascript
   * const snapshotId = await provider.send("evm_snapshot");
   * ```
   *
   * @example
   * ```javascript
   * const provider = ganache.provider();
   * const [from, to] = await provider.send("eth_accounts");
   * const startingBalance = BigInt(await provider.send("eth_getBalance", [from]));
   *
   * // take a snapshot
   * const snapshotId = await provider.send("evm_snapshot");
   *
   * // send value to another account (over-simplified example)
   * await provider.send("eth_subscribe", ["newHeads"]);
   * await provider.send("eth_sendTransaction", [{from, to, value: "0xffff"}]);
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   *
   * // ensure balance has updated
   * const newBalance = await provider.send("eth_getBalance", [from]);
   * assert(BigInt(newBalance) < startingBalance);
   *
   * // revert the snapshot
   * const isReverted = await provider.send("evm_revert", [snapshotId]);
   * assert(isReverted);
   *
   * const endingBalance = await provider.send("eth_getBalance", [from]);
   * assert.strictEqual(BigInt(endingBalance), startingBalance);
   * ```
   */
  async evm_snapshot() {
    return Quantity.from(this.#blockchain.snapshot());
  }

  /**
   * Unlocks any unknown account.
   * @param address address the address of the account to unlock
   * @param duration (default: disabled) Duration in seconds how long the account
   * should remain unlocked for. Set to 0 to disable automatic locking.
   * @returns `true` if the account was unlocked successfully, `false` if the
   * account was already unlocked. Throws an error if the account could not be
   * unlocked.
   */
  async evm_unlockUnknownAccount(address: string, duration: number = 0) {
    return this.#wallet.unlockUnknownAccount(address.toLowerCase(), duration);
  }

  /**
   * Locks any unknown account.
   *
   * Note: accounts known to the `personal` namespace and accounts returned by
   * `eth_accounts` cannot be locked using this method.
   *
   * @param address address the address of the account to lock
   * @returns `true` if the account was locked successfully, `false` if the
   * account was already locked. Throws an error if the account could not be
   * locked.
   */
  async evm_lockUnknownAccount(address: string) {
    const lowerAddress = address.toLowerCase();
    // if this is a known account, don'we can't unlock it this way
    if (this.#wallet.knownAccounts.has(lowerAddress)) {
      throw new Error("cannot lock known/personal account");
    }
    return this.#wallet.lockAccount(lowerAddress);
  }

  //#endregion evm

  //#region miner
  /**
   * Resume the CPU mining process with the given number of threads.
   *
   * Note: `threads` is ignored.
   * @param threads
   * @returns true
   */
  @assertArgLength(0, 1)
  async miner_start(threads: number = 1) {
    if (this.#options.miner.legacyInstamine === true) {
      const transactions = await this.#blockchain.resume(threads);
      if (transactions != null && this.#options.chain.vmErrorsOnRPCResponse) {
        assertExceptionalTransactions(transactions);
      }
    } else {
      this.#blockchain.resume(threads);
    }
    return true;
  }

  /**
   * Stop the CPU mining operation.
   */
  @assertArgLength(0)
  async miner_stop() {
    this.#blockchain.pause();
    return true;
  }

  /**
   *
   * @param number Sets the minimal accepted gas price when mining transactions.
   * Any transactions that are below this limit are excluded from the mining
   * process.
   */
  @assertArgLength(1)
  async miner_setGasPrice(number: string) {
    this.#options.miner.gasPrice = Quantity.from(number);
    return true;
  }

  /**
   * Sets the etherbase, where mining rewards will go.
   * @param address
   */
  @assertArgLength(1)
  async miner_setEtherbase(address: string) {
    this.#blockchain.coinbase = Address.from(address);
    return true;
  }

  /**
   * Set the extraData block header field a miner can include.
   * @param extra
   */
  @assertArgLength(1)
  async miner_setExtra(extra: string) {
    const bytes = Data.from(extra);
    const length = bytes.toBuffer().length;
    if (length > 32) {
      throw new Error(`extra exceeds max length. ${length} > 32`);
    }
    this.#options.miner.extraData = bytes;
    return true;
  }
  //#endregion

  //#region web3
  /**
   * Returns the current client version.
   * @returns The current client version.
   */
  @assertArgLength(0)
  async web3_clientVersion() {
    return CLIENT_VERSION;
  }

  /**
   * Returns Keccak-256 (not the standardized SHA3-256) of the given data.
   * @param {data} the data to convert into a SHA3 hash.
   * @returns The SHA3 result of the given string.
   */
  @assertArgLength(1)
  async web3_sha3(data: string) {
    return Data.from(keccak(Buffer.from(data)));
  }
  //#endregion

  //#region net
  /**
   * Returns the current network id.
   * @returns The current network id. This value should NOT be JSON-RPC
   * Quantity/Data encoded.
   */
  @assertArgLength(0)
  async net_version() {
    return this.#options.chain.networkId.toString();
  }

  /**
   * Returns `true` if client is actively listening for network connections.
   * @returns `true` when listening, otherwise `false`.
   */
  @assertArgLength(0)
  async net_listening() {
    return true;
  }

  /**
   * Returns number of peers currently connected to the client.
   * @returns integer of the number of connected peers.
   */
  @assertArgLength(0)
  async net_peerCount() {
    return RPCQUANTITY_ZERO;
  }
  //#endregion

  //#region eth

  /**
   * Generates and returns an estimate of how much gas is necessary to allow the
   * transaction to complete. The transaction will not be added to the
   * blockchain. Note that the estimate may be significantly more than the
   * amount of gas actually used by the transaction, for a variety of reasons
   * including EVM mechanics and node performance.
   *
   * @returns the amount of gas used.
   */
  @assertArgLength(1, 2)
  async eth_estimateGas(
    transaction: any,
    blockNumber: Buffer | Tag | string = Tag.LATEST
  ): Promise<Quantity> {
    const blockchain = this.#blockchain;
    const blocks = blockchain.blocks;
    const parentBlock = await blocks.get(blockNumber);
    const parentHeader = parentBlock.header;
    const options = this.#options;

    const generateVM = () => {
      return blockchain.vm.copy();
    };
    return new Promise((resolve, reject) => {
      const { coinbase } = blockchain;
      const tx = Transaction.fromJSON(
        transaction,
        this.#common,
        Transaction.types.fake
      );
      if (tx._from == null) {
        tx._from = coinbase.toBuffer();
      }
      if (tx.gasLimit.length !== 0) {
        tx.gas = tx.gasLimit;
      } else {
        if (tx.gas.length !== 0) {
          tx.gasLimit = tx.gas;
        } else {
          // eth_estimateGas isn't subject to regular transaction gas limits
          tx.gas = tx.gasLimit = options.miner.callGasLimit.toBuffer();
        }
      }

      const newBlock = new RuntimeBlock(
        Quantity.from((parentHeader.number.toBigInt() || 0n) + 1n),
        parentHeader.parentHash,
        parentHeader.miner,
        tx.gas,
        parentHeader.timestamp,
        options.miner.difficulty,
        parentHeader.totalDifficulty
      );
      const runArgs = {
        tx: tx,
        block: newBlock,
        skipBalance: true,
        skipNonce: true
      };
      estimateGas(generateVM, runArgs, (err: Error, result: any) => {
        if (err) return reject(err);
        resolve(Quantity.from(result.gasEstimate.toBuffer()));
      });
    });
  }

  /**
   * Returns the current ethereum protocol version.
   * @returns The current ethereum protocol version.
   */
  @assertArgLength(0)
  async eth_protocolVersion() {
    return PROTOCOL_VERSION;
  }

  /**
   * Returns an object with data about the sync status or false.
   * @returns An object with sync status data or false, when not syncing:
   *   startingBlock: {bigint} - The block at which the import started (will
   *    only be reset, after the sync reached his head)
   *   currentBlock: {bigint} - The current block, same as eth_blockNumber
   *   highestBlock: {bigint} - The estimated highest block
   */
  @assertArgLength(0)
  async eth_syncing() {
    return false;
  }

  /**
   * Returns the client coinbase address.
   * @returns 20 bytes - the current coinbase address.
   */
  @assertArgLength(0)
  async eth_coinbase() {
    return this.#blockchain.coinbase;
  }

  /**
   * Returns information about a block by block number.
   * @param number QUANTITY|TAG - integer of a block number, or the string "earliest", "latest" or "pending", as in the
   * default block parameter.
   * @param transactions Boolean - If true it returns the full transaction objects, if false only the hashes of the
   * transactions.
   * @returns the block, `null` if the block doesn't exist.
   */
  @assertArgLength(1, 2)
  async eth_getBlockByNumber(number: string | Buffer, transactions = false) {
    const block = await this.#blockchain.blocks.get(number).catch(_ => null);
    return block ? block.toJSON(transactions) : null;
  }

  /**
   * Returns information about a block by block hash.
   * @param number QUANTITY|TAG - integer of a block number, or the string "earliest", "latest" or "pending", as in the
   * default block parameter.
   * @param transactions Boolean - If true it returns the full transaction objects, if false only the hashes of the
   * transactions.
   * @returns Block
   */
  @assertArgLength(1, 2)
  async eth_getBlockByHash(hash: string | Buffer, transactions = false) {
    const block = await this.#blockchain.blocks
      .getByHash(hash)
      .catch(_ => null);
    return block ? block.toJSON(transactions) : null;
  }

  /**
   * Returns the number of transactions in a block from a block matching the given block number.
   * @param number QUANTITY|TAG - integer of a block number, or the string "earliest", "latest" or "pending", as in the
   * default block parameter.
   */
  @assertArgLength(1)
  async eth_getBlockTransactionCountByNumber(number: string | Buffer) {
    const rawBlock = await this.#blockchain.blocks.getRaw(number);
    if (rawBlock) {
      const data = rlpDecode(rawBlock);
      return Quantity.from((data[1] as any).length);
    } else {
      return null;
    }
  }

  /**
   * Returns the number of transactions in a block from a block matching the given block hash.
   * @param hash DATA, 32 Bytes - hash of a block.
   */
  @assertArgLength(1)
  async eth_getBlockTransactionCountByHash(hash: string | Buffer) {
    const number = await this.#blockchain.blocks.getNumberFromHash(hash);
    if (number) {
      return this.eth_getBlockTransactionCountByNumber(number);
    } else {
      return null;
    }
  }

  @assertArgLength(0)
  async eth_getCompilers() {
    return [] as string[];
  }

  /**
   * Returns information about a transaction by block hash and transaction index position.
   * @param hash DATA, 32 Bytes - hash of a block.
   * @param index QUANTITY - integer of the transaction index position.
   */
  @assertArgLength(2)
  async eth_getTransactionByBlockHashAndIndex(
    hash: string | Buffer,
    index: string
  ) {
    const block = await this.eth_getBlockByHash(hash, true);
    if (block) {
      const tx = block.transactions[parseInt(index, 10)];
      if (tx) return tx;
    }
    return null;
  }

  /**
   * Returns information about a transaction by block number and transaction index position.
   * @param number QUANTITY|TAG - a block number, or the string "earliest", "latest" or "pending", as in the default
   * block parameter.
   * @param index QUANTITY - integer of the transaction index position.
   */
  @assertArgLength(2)
  async eth_getTransactionByBlockNumberAndIndex(
    number: string | Buffer,
    index: string
  ) {
    const block = await this.eth_getBlockByNumber(number, true);
    return block.transactions[parseInt(index, 10)];
  }

  /**
   * Returns the number of uncles in a block from a block matching the given block hash.
   * @param hash DATA, 32 Bytes - hash of a block.
   */
  @assertArgLength(1)
  async eth_getUncleCountByBlockHash(hash: string | Buffer) {
    return RPCQUANTITY_ZERO;
  }

  /**
   * Returns the number of uncles in a block from a block matching the given block hash.
   * @param hash DATA, 32 Bytes - hash of a block.
   */
  @assertArgLength(1)
  async eth_getUncleCountByBlockNumber(number: string | Buffer) {
    return RPCQUANTITY_ZERO;
  }

  /**
   * Returns information about a uncle of a block by hash and uncle index position.
   *
   * @param hash - hash of a block
   * @param index - the uncle's index position.
   */
  @assertArgLength(2)
  async eth_getUncleByBlockHashAndIndex(hash: Data, index: Quantity) {
    return null as ReturnType<EthereumApi["eth_getBlockByHash"]>;
  }

  /**
   * Returns information about a uncle of a block by hash and uncle index position.
   *
   * @param blockNumber - a block number, or the string "earliest", "latest" or "pending", as in the default block
   * parameter.
   * @param uncleIndex - the uncle's index position.
   */
  @assertArgLength(2)
  async eth_getUncleByBlockNumberAndIndex(
    blockNumber: Buffer | Tag,
    uncleIndex: Quantity
  ) {
    return null as ReturnType<EthereumApi["eth_getBlockByHash"]>;
  }

  /**
   * Returns: An Array with the following elements
   * 1: DATA, 32 Bytes - current block header pow-hash
   * 2: DATA, 32 Bytes - the seed hash used for the DAG.
   * 3: DATA, 32 Bytes - the boundary condition ("target"), 2^256 / difficulty.
   *
   * @param {QUANTITY} filterId - A filter id
   * @returns the hash of the current block, the seedHash, and the boundary condition to be met ("target").
   */
  @assertArgLength(1)
  async eth_getWork(filterId: Quantity) {
    return [] as [string, string, string] | [];
  }

  /**
   * Used for submitting a proof-of-work solution
   *
   * @param {DATA, 8 Bytes} nonce - The nonce found (64 bits)
   * @param {DATA, 32 Bytes} powHash - The header's pow-hash (256 bits)
   * @param {DATA, 32 Bytes} digest - The mix digest (256 bits)
   * @returns `true` if the provided solution is valid, otherwise `false`.
   */
  @assertArgLength(3)
  async eth_submitWork(nonce: Data, powHash: Data, digest: Data) {
    return false;
  }

  /**
   * Used for submitting mining hashrate.
   *
   * @param {String} hashRate - a hexadecimal string representation (32 bytes) of the hash rate
   * @param {String} clientID - A random hexadecimal(32 bytes) ID identifying the client
   * @returns `true` if submitting went through succesfully and `false` otherwise.
   */
  @assertArgLength(2)
  async eth_submitHashrate(hashRate: string, clientID: string) {
    return false;
  }

  /**
   * Returns `true` if client is actively mining new blocks.
   * @returns returns `true` if the client is mining, otherwise `false`.
   */
  @assertArgLength(0)
  async eth_mining() {
    // we return the blockchain's started state
    return this.#blockchain.isStarted();
  }

  /**
   * Returns the number of hashes per second that the node is mining with.
   * @returns number of hashes per second.
   */
  @assertArgLength(0)
  async eth_hashrate() {
    return RPCQUANTITY_ZERO;
  }

  /**
   * Returns the current price per gas in wei.
   * @returns integer of the current gas price in wei.
   */
  @assertArgLength(0)
  async eth_gasPrice() {
    return this.#options.miner.gasPrice;
  }

  /**
   * Returns a list of addresses owned by client.
   * @returns Array of 20 Bytes - addresses owned by the client.
   */
  @assertArgLength(0)
  async eth_accounts() {
    return this.#wallet.addresses;
  }

  /**
   * Returns the number of the most recent block.
   * @returns integer of the current block number the client is on.
   */
  @assertArgLength(0)
  async eth_blockNumber() {
    return this.#blockchain.blocks.latest.header.number;
  }

  /**
   * Returns the currently configured chain id, a value used in
   * replay-protected transaction signing as introduced by EIP-155.
   * @returns The chain id as a string.
   * @EIP [155 – Simple replay attack protection](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md)
   *
   * @example
   * ```javascript
   * const chainId = await provider.send("eth_chainId");
   * console.log(chainId);
   * ```
   */
  @assertArgLength(0)
  async eth_chainId() {
    return Quantity.from(this.#options.chain.chainId);
  }

  /**
   * Returns the balance of the account of given address.
   * @param address 20 Bytes - address to check for balance.
   * @param blockNumber integer block number, or the string "latest", "earliest"
   *  or "pending", see the default block parameter
   */
  @assertArgLength(1, 2)
  async eth_getBalance(
    address: string,
    blockNumber: Buffer | Tag = Tag.LATEST
  ) {
    return this.#blockchain.accounts.getBalance(
      Address.from(address),
      blockNumber
    );
  }

  /**
   * Returns code at a given address.
   *
   * @param address 20 Bytes - address
   * @param blockNumber integer block number, or the string "latest", "earliest" or "pending", see the default block
   * parameter
   * @returns the code from the given address.
   */
  @assertArgLength(1, 2)
  async eth_getCode(address: Buffer, blockNumber: Buffer | Tag = Tag.LATEST) {
    const blockchain = this.#blockchain;
    const blockProm = blockchain.blocks.getRaw(blockNumber);

    const trie = blockchain.trie.copy();
    const block = await blockProm;
    if (!block) throw new Error("header not found");

    const blockData = (rlpDecode(block) as unknown) as [
      [Buffer, Buffer, Buffer, Buffer /* stateRoot */] /* header */,
      Buffer[],
      Buffer[]
    ];
    const headerData = blockData[0];
    const blockStateRoot = headerData[3];
    trie.root = blockStateRoot;

    const addressDataPromise = this.#blockchain.getFromTrie(
      trie,
      Address.from(address).toBuffer()
    );

    const addressData = await addressDataPromise;
    // An address's codeHash is stored in the 4th rlp entry
    const codeHash = ((rlpDecode(addressData) as any) as [
      Buffer /*nonce*/,
      Buffer /*amount*/,
      Buffer /*stateRoot*/,
      Buffer /*codeHash*/
    ])[3];
    // if this address isn't a contract, return 0x
    if (!codeHash || KECCAK256_NULL.equals(codeHash)) {
      return Data.from("0x");
    }
    return new Promise((resolve, reject) => {
      trie.getRaw(codeHash, (err: Error, data: Buffer) => {
        if (err) return void reject(err);
        resolve(Data.from(data));
      });
    });
  }

  /**
   * Returns the value from a storage position at a given address.
   * @param data 20 Bytes - address of the storage.
   * @param quantity integer of the position in the storage.
   * @param blockNumber integer block number, or the string "latest", "earliest"
   *  or "pending", see the default block parameter
   */
  @assertArgLength(2, 3)
  async eth_getStorageAt(
    address: string,
    position: bigint | number,
    blockNumber: string | Buffer | Tag = Tag.LATEST
  ) {
    const blockProm = this.#blockchain.blocks.getRaw(blockNumber);

    const trie = this.#blockchain.trie.copy();
    const block = await blockProm;
    if (!block) throw new Error("header not found");

    const blockData = (rlpDecode(block) as unknown) as [
      [Buffer, Buffer, Buffer, Buffer /* stateRoot */] /* header */,
      Buffer[],
      Buffer[]
    ];
    const headerData = blockData[0];
    const blockStateRoot = headerData[3];
    trie.root = blockStateRoot;

    const addressDataPromise = this.#blockchain.getFromTrie(
      trie,
      Address.from(address).toBuffer()
    );

    const posBuff = Quantity.from(position).toBuffer();
    const length = posBuff.length;
    let paddedPosBuff: Buffer;
    if (length < 32) {
      // storage locations are 32 bytes wide, so we need to expand any value
      // given to 32 bytes.
      paddedPosBuff = Buffer.allocUnsafe(32).fill(0);
      posBuff.copy(paddedPosBuff, 32 - length);
    } else if (length === 32) {
      paddedPosBuff = posBuff;
    } else {
      // if the position value we're passed is > 32 bytes, truncate it. This is
      // what geth does.
      paddedPosBuff = posBuff.slice(-32);
    }

    const addressData = await addressDataPromise;
    // An address's stateRoot is stored in the 3rd rlp entry
    trie.root = ((rlpDecode(addressData) as any) as [
      Buffer /*nonce*/,
      Buffer /*amount*/,
      Buffer /*stateRoot*/,
      Buffer /*codeHash*/
    ])[2];
    const value = await this.#blockchain.getFromTrie(trie, paddedPosBuff);
    return Data.from(rlpDecode(value));
  }

  /**
   * Returns the information about a transaction requested by transaction hash.
   *
   * @param transactionHash 32 Bytes - hash of a transaction
   */
  @assertArgLength(1)
  async eth_getTransactionByHash(transactionHash: string) {
    const { transactions } = this.#blockchain;
    const hashBuffer = Data.from(transactionHash).toBuffer();

    // we must check the database before checking the pending cache, because the
    // cache is updated _after_ the transaction is already in the database, and
    // the database contains block info whereas the pending cache doesn't.
    const transaction = await transactions.get(hashBuffer);

    if (transaction === null) {
      // if we can't find it in the list of pending transactions, check the db!
      const tx = transactions.transactionPool.find(hashBuffer);
      return tx ? tx.toJSON(null) : null;
    } else {
      return transaction.toJSON();
    }
  }

  /**
   * Returns the receipt of a transaction by transaction hash.
   *
   * Note That the receipt is not available for pending transactions.
   *
   * @param transactionHash 32 Bytes - hash of a transaction
   * @returns Returns the receipt of a transaction by transaction hash.
   */
  @assertArgLength(1)
  async eth_getTransactionReceipt(transactionHash: string) {
    const { transactions, transactionReceipts, blocks } = this.#blockchain;
    const dataHash = Data.from(transactionHash);
    const txHash = dataHash.toBuffer();

    const transactionPromise = transactions.get(txHash);
    const receiptPromise = transactionReceipts.get(txHash);
    const blockPromise = transactionPromise.then(t =>
      t ? blocks.get(t._blockNum) : null
    );
    const [transaction, receipt, block] = await Promise.all([
      transactionPromise,
      receiptPromise,
      blockPromise
    ]);
    if (transaction) {
      return receipt.toJSON(block, transaction);
    }

    // if we are performing non-legacy instamining, then check to see if the
    // transaction is pending so as to warn about the v7 breaking change
    const options = this.#options;
    if (
      options.miner.blockTime <= 0 &&
      options.miner.legacyInstamine !== true &&
      this.#blockchain.isStarted()
    ) {
      const tx = this.#blockchain.transactions.transactionPool.find(txHash);
      if (tx != null) {
        options.logging.logger.log(
          " > Ganache `eth_getTransactionReceipt` notice: the transaction with hash\n" +
            ` > \`${dataHash.toString()}\` has not\n` +
            " > yet been mined. See https://trfl.co/v7-instamine for additional information."
        );
      }
    }
    return null;
  }

  /**
   * Creates new message call transaction or a contract creation, if the data field contains code.
   * @param transaction
   * @returns The transaction hash
   */
  @assertArgLength(1)
  async eth_sendTransaction(transaction: any) {
    let fromString = transaction.from;
    let from: Address;
    if (fromString) {
      from = Address.from(transaction.from);
      fromString = from.toString().toLowerCase();
    }

    if (fromString == null) {
      throw new Error("from not found; is required");
    }

    // Error checks. It's possible to JSON.stringify a Buffer to JSON.
    // we actually now handle this "properly" (not sure about spec), but for
    // legacy reasons we don't allow it.
    if (transaction.to && typeof transaction.to !== "string") {
      throw new Error("invalid to address");
    }

    const wallet = this.#wallet;
    const isKnownAccount = wallet.knownAccounts.has(fromString);
    const isUnlockedAccount = wallet.unlockedAccounts.has(fromString);

    if (!isUnlockedAccount) {
      const msg = isKnownAccount
        ? "authentication needed: password or unlock"
        : "sender account not recognized";
      throw new Error(msg);
    }

    const type = isKnownAccount
      ? Transaction.types.none
      : Transaction.types.fake;

    const tx = Transaction.fromJSON(transaction, this.#common, type);

    if (tx.gasLimit.length === 0) {
      const defaultLimit = this.#options.miner.defaultTransactionGasLimit;
      if (defaultLimit === utils.RPCQUANTITY_EMPTY) {
        // if the default limit is `RPCQUANTITY_EMPTY` use a gas estimate
        tx.gasLimit = (
          await this.eth_estimateGas(transaction, "latest")
        ).toBuffer();
      } else {
        tx.gasLimit = defaultLimit.toBuffer();
      }
    }

    if (tx.gasPrice.length === 0) {
      tx.gasPrice = this.#options.miner.gasPrice.toBuffer();
    }

    if (tx.value.length === 0) {
      tx.value = Buffer.from([0]);
    }

    if (tx.to.equals(utils.BUFFER_ZERO)) {
      tx.to = utils.BUFFER_EMPTY;
    }

    if (isUnlockedAccount) {
      const secretKey = wallet.unlockedAccounts.get(fromString);
      return this.#blockchain.queueTransaction(tx, secretKey);
    } else {
      return this.#blockchain.queueTransaction(tx);
    }
  }

  /**
   * Creates new message call transaction or a contract creation for signed transactions.
   * @param transaction
   * @returns The transaction hash
   */
  @assertArgLength(1)
  async eth_sendRawTransaction(transaction: string) {
    const tx = new Transaction(
      transaction,
      this.#common,
      Transaction.types.signed
    );
    return this.#blockchain.queueTransaction(tx);
  }

  /**
   * The sign method calculates an Ethereum specific signature with:
   * `sign(keccak256("\x19Ethereum Signed Message:\n" + message.length + message)))`.
   *
   * By adding a prefix to the message makes the calculated signature
   * recognizable as an Ethereum specific signature. This prevents misuse where a malicious DApp can sign arbitrary data
   *  (e.g. transaction) and use the signature to impersonate the victim.
   *
   * Note the address to sign with must be unlocked.
   *
   * @param account address
   * @param data message to sign
   * @returns Signature
   */
  @assertArgLength(2)
  async eth_sign(address: string | Buffer, message: string | Buffer) {
    const account = Address.from(address).toString().toLowerCase();

    const privateKey = this.#wallet.unlockedAccounts.get(account);
    if (privateKey == null) {
      throw new Error("cannot sign data; no private key");
    }

    const chainId = this.#options.chain.chainId;
    const messageHash = hashPersonalMessage(Data.from(message).toBuffer());
    const { v, r, s } = ecsign(messageHash, privateKey.toBuffer(), chainId);
    return toRpcSig(v, r, s, chainId);
  }

  /**
   *
   * @param address Address of the account that will sign the messages.
   * @param typedData Typed structured data to be signed.
   * @returns Signature. As in `eth_sign`, it is a hex encoded 129 byte array
   * starting with `0x`. It encodes the `r`, `s`, and `v` parameters from
   * appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf)
   *  in big-endian format. Bytes 0...64 contain the `r` parameter, bytes
   * 64...128 the `s` parameter, and the last byte the `v` parameter. Note
   * that the `v` parameter includes the chain id as specified in [EIP-155](https://eips.ethereum.org/EIPS/eip-155).
   * @EIP [712](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md)
   */
  @assertArgLength(2)
  async eth_signTypedData(address: string | Buffer, typedData: TypedData) {
    const account = Address.from(address).toString().toLowerCase();

    const privateKey = this.#wallet.unlockedAccounts.get(account);
    if (privateKey == null) {
      throw new Error("cannot sign data; no private key");
    }

    if (!typedData.types) {
      throw new Error("cannot sign data; types missing");
    }

    if (!typedData.types.EIP712Domain) {
      throw new Error("cannot sign data; EIP712Domain definition missing");
    }

    if (!typedData.domain) {
      throw new Error("cannot sign data; domain missing");
    }

    if (!typedData.primaryType) {
      throw new Error("cannot sign data; primaryType missing");
    }

    if (!typedData.message) {
      throw new Error("cannot sign data; message missing");
    }

    return signTypedData_v4(privateKey.toBuffer(), { data: typedData });
  }

  /**
   * Starts a subscription to a particular event. For every event that matches
   * the subscription a JSON-RPC notification with event details and
   * subscription ID will be sent to a client.
   *
   * @param subscriptionName
   * @returns A subscription id.
   */
  eth_subscribe(subscriptionName: SubscriptionName): PromiEvent<Quantity>;
  /**
   * Starts a subscription to a particular event. For every event that matches
   * the subscription a JSON-RPC notification with event details and
   * subscription ID will be sent to a client.
   *
   * @param subscriptionName
   * @param options Filter options:
   *  * `address`: either an address or an array of addresses. Only logs that
   *    are created from these addresses are returned
   *  * `topics`, only logs which match the specified topics
   * @returns A subscription id.
   */
  eth_subscribe(
    subscriptionName: "logs",
    options: BaseFilterArgs
  ): PromiEvent<Quantity>;
  @assertArgLength(1, 2)
  eth_subscribe(subscriptionName: SubscriptionName, options?: BaseFilterArgs) {
    const subscriptions = this.#subscriptions;
    switch (subscriptionName) {
      case "newHeads": {
        const subscription = this.#getId();
        const promiEvent = PromiEvent.resolve(subscription);

        const unsubscribe = this.#blockchain.on("block", (block: Block) => {
          const value = block;
          const header = value.header;
          const result = {
            logsBloom: header.logsBloom,
            miner: header.miner,
            difficulty: header.difficulty,
            totalDifficulty: header.totalDifficulty,
            extraData: header.extraData,
            gasLimit: header.gasLimit,
            gasUsed: header.gasUsed,
            hash: block.hash(),
            mixHash: block.header.mixHash,
            nonce: header.nonce,
            number: header.number,
            parentHash: header.parentHash,
            receiptsRoot: header.receiptsRoot,
            stateRoot: header.stateRoot,
            timestamp: header.timestamp,
            transactionsRoot: header.transactionsRoot,
            sha3Uncles: header.sha3Uncles
          };

          // TODO: move the JSON stringification closer to where the message
          // is actually sent to the listener
          promiEvent.emit("message", {
            type: "eth_subscription",
            data: {
              result: JSON.parse(JSON.stringify(result)),
              subscription: subscription.toString()
            }
          });
        });
        subscriptions.set(subscription.toString(), unsubscribe);
        return promiEvent;
      }
      case "logs": {
        const subscription = this.#getId();
        const promiEvent = PromiEvent.resolve(subscription);

        const { addresses, topics } = options
          ? parseFilterDetails(options)
          : { addresses: [], topics: [] };
        const unsubscribe = this.#blockchain.on(
          "blockLogs",
          (blockLogs: BlockLogs) => {
            // TODO: move the JSON stringification closer to where the message
            // is actually sent to the listener
            const result = JSON.parse(
              JSON.stringify([...blockLogs.filter(addresses, topics)])
            );
            promiEvent.emit("message", {
              type: "eth_subscription",
              data: {
                result,
                subscription: subscription.toString()
              }
            });
          }
        );
        subscriptions.set(subscription.toString(), unsubscribe);
        return promiEvent;
      }
      case "newPendingTransactions": {
        const subscription = this.#getId();
        const promiEvent = PromiEvent.resolve(subscription);

        const unsubscribe = this.#blockchain.on(
          "pendingTransaction",
          (transaction: Transaction) => {
            const result = Data.from(transaction.hash(), 32).toString();
            promiEvent.emit("message", {
              type: "eth_subscription",
              data: {
                result,
                subscription: subscription.toString()
              }
            });
          }
        );
        subscriptions.set(subscription.toString(), unsubscribe);
        return promiEvent;
      }
      case "syncing": {
        // ganache doesn't sync, so doing nothing is perfectly valid.
        const subscription = this.#getId();
        const promiEvent = PromiEvent.resolve(subscription);

        this.#subscriptions.set(subscription.toString(), () => {});
        return promiEvent;
      }
      default:
        throw new CodedError(
          `no \"${subscriptionName}\" subscription in eth namespace`,
          ErrorCodes.METHOD_NOT_FOUND
        );
    }
  }

  @assertArgLength(1)
  async eth_unsubscribe(subscriptionId: SubscriptionId) {
    const subscriptions = this.#subscriptions;
    const unsubscribe = subscriptions.get(subscriptionId);
    if (unsubscribe) {
      subscriptions.delete(subscriptionId);
      unsubscribe();
      return true;
    } else {
      return false;
    }
  }

  /**
   * Creates a filter in the node, to notify when a new block arrives. To check
   * if the state has changed, call `eth_getFilterChanges`.
   *
   * @returns A filter id.
   */
  @assertArgLength(0)
  async eth_newBlockFilter() {
    const unsubscribe = this.#blockchain.on("block", (block: Block) => {
      value.updates.push(block.hash());
    });
    const value = {
      updates: [],
      unsubscribe,
      filter: null,
      type: FilterTypes.block
    };
    const filterId = this.#getId();
    this.#filters.set(filterId.toString(), value);
    return filterId;
  }

  /**
   * Creates a filter in the node, to notify when new pending transactions
   * arrive. To check if the state has changed, call `eth_getFilterChanges`.
   *
   * @returns A filter id.
   */
  @assertArgLength(0)
  async eth_newPendingTransactionFilter() {
    const unsubscribe = this.#blockchain.on(
      "pendingTransaction",
      (transaction: Transaction) => {
        value.updates.push(Data.from(transaction.hash(), 32));
      }
    );
    const value = {
      updates: [],
      unsubscribe,
      filter: null,
      type: FilterTypes.pendingTransaction
    };
    const filterId = this.#getId();
    this.#filters.set(filterId.toString(), value);
    return filterId;
  }

  /**
   * Creates a filter object, based on filter options, to notify when the state
   * changes (logs). To check if the state has changed, call
   * `eth_getFilterChanges`.
   *
   * If the from `fromBlock` or `toBlock` option are equal to "latest" the
   * filter continually append logs for whatever block is seen as latest at the
   * time the block was mined, not just for the block that was "latest" when the
   * filter was created.
   *
   * ### A note on specifying topic filters:
   * Topics are order-dependent. A transaction with a log with topics [A, B]
   * will be matched by the following topic filters:
   *  * `[]` “anything”
   *  * `[A]` “A in first position (and anything after)”
   *  * `[null, B]` “anything in first position AND B in second position (and
   * anything after)”
   *  * `[A, B]` “A in first position AND B in second position (and anything
   * after)”
   *  * `[[A, B], [A, B]]` “(A OR B) in first position AND (A OR B) in second
   * position (and anything after)”
   *
   * @param filter The filter options
   */
  @assertArgLength(0, 1)
  async eth_newFilter(filter: RangeFilterArgs = {}) {
    const blockchain = this.#blockchain;
    const { addresses, topics } = parseFilterDetails(filter);
    const unsubscribe = blockchain.on("blockLogs", (blockLogs: BlockLogs) => {
      const blockNumber = blockLogs.blockNumber;
      // everytime we get a blockLogs message we re-check what the filter's
      // range is. We do this because "latest" isn't the latest block at the
      // time the filter was set up, rather it is the actual latest *mined*
      // block (that is: not pending)
      const { fromBlock, toBlock } = parseFilterRange(filter, blockchain);
      if (fromBlock <= blockNumber && toBlock >= blockNumber) {
        value.updates.push(...blockLogs.filter(addresses, topics));
      }
    });
    const value = { updates: [], unsubscribe, filter, type: FilterTypes.log };
    const filterId = this.#getId();
    this.#filters.set(filterId.toString(), value);
    return filterId;
  }

  /**
   * Polling method for a filter, which returns an array of logs, block hashes,
   * or transaction hashes, depending on the filter type, which occurred since
   * last poll.
   *
   * @param filterId the filter id.
   * @returns an array of logs, block hashes, or transaction hashes, depending
   * on the filter type, which occurred since last poll.
   */
  @assertArgLength(1)
  async eth_getFilterChanges(filterId: string) {
    const filter = this.#filters.get(filterId);
    if (filter) {
      const updates = filter.updates;
      filter.updates = [];
      return updates;
    } else {
      throw new Error("filter not found");
    }
  }

  /**
   * Uninstalls a filter with given id. Should always be called when watch is
   * no longer needed.
   *
   * @param filterId the filter id.
   * @returns `true` if the filter was successfully uninstalled, otherwise
   * `false`.
   */
  @assertArgLength(1)
  async eth_uninstallFilter(filterId: string) {
    const filter = this.#filters.get(filterId);
    if (!filter) return false;
    filter.unsubscribe();
    return this.#filters.delete(filterId);
  }

  /**
   * Returns an array of all logs matching filter with given id.
   *
   * @returns Array of log objects, or an empty array.
   */
  @assertArgLength(1)
  async eth_getFilterLogs(filterId: string) {
    const filter = this.#filters.get(filterId);
    if (filter && filter.type === FilterTypes.log) {
      return this.eth_getLogs(filter.filter);
    } else {
      throw new Error("filter not found");
    }
  }

  /**
   * Returns an array of all logs matching a given filter object.
   *
   * @param filter The filter options
   * @returns Array of log objects, or an empty array.
   */
  @assertArgLength(1)
  async eth_getLogs(filter: FilterArgs) {
    const blockchain = this.#blockchain;
    if ("blockHash" in filter) {
      const { addresses, topics } = parseFilterDetails(filter);
      const blockNumber = await blockchain.blocks.getNumberFromHash(
        filter.blockHash
      );
      if (!blockNumber) return [];
      const blockLogs = blockchain.blockLogs;
      const logs = await blockLogs.get(blockNumber);
      return logs ? [...logs.filter(addresses, topics)] : [];
    } else {
      const { addresses, topics, fromBlock, toBlockNumber } = parseFilter(
        filter,
        blockchain
      );

      const blockLogs = blockchain.blockLogs;
      const pendingLogsPromises: Promise<BlockLogs>[] = [
        blockLogs.get(fromBlock.toBuffer())
      ];

      const fromBlockNumber = fromBlock.toNumber();
      // if we have a range of blocks to search, do that here:
      if (fromBlockNumber !== toBlockNumber) {
        // fetch all the blockLogs in-between `fromBlock` and `toBlock` (excluding
        // from, because we already started fetching that one)
        for (let i = fromBlockNumber + 1, l = toBlockNumber + 1; i < l; i++) {
          pendingLogsPromises.push(blockLogs.get(Quantity.from(i).toBuffer()));
        }
      }

      // now filter and compute all the blocks' blockLogs (in block order)
      return Promise.all(pendingLogsPromises).then(blockLogsRange => {
        const filteredBlockLogs: ReturnType<
          typeof BlockLogs["logToJSON"]
        >[] = [];
        blockLogsRange.forEach(blockLogs => {
          // TODO(perf): this loops over all addresses for every block.
          // Maybe make it loop only once?
          if (blockLogs)
            filteredBlockLogs.push(...blockLogs.filter(addresses, topics));
        });
        return filteredBlockLogs;
      });
    }
  }

  /**
   * Returns the number of transactions sent from an address.
   *
   * @param address
   * @param blockNumber integer block number, or the string "latest", "earliest"
   * or "pending", see the default block parameter
   * @returns integer of the number of transactions sent from this address.
   */
  @assertArgLength(1, 2)
  async eth_getTransactionCount(
    address: string,
    blockNumber: Buffer | Tag = Tag.LATEST
  ) {
    return this.#blockchain.accounts.getNonce(
      Address.from(address),
      blockNumber
    );
  }

  /**
   * Executes a new message call immediately without creating a transaction on the block chain.
   *
   * @param transaction
   * @param blockNumber
   *
   * @returns the return value of executed contract.
   */
  @assertArgLength(1, 3)
  async eth_call(
    transaction: any,
    blockNumber: string | Buffer | Tag = Tag.LATEST,
    overrides: SimulationOverrides = {}
  ) {
    const blockchain = this.#blockchain;
    const blocks = blockchain.blocks;
    const parentBlock = await blocks.get(blockNumber);
    const parentHeader = parentBlock.header;
    const options = this.#options;

    let gas: Quantity;
    if (typeof transaction.gasLimit === "undefined") {
      if (typeof transaction.gas !== "undefined") {
        gas = Quantity.from(transaction.gas);
      } else {
        // eth_call isn't subject to regular transaction gas limits by default
        gas = options.miner.callGasLimit;
      }
    } else {
      gas = Quantity.from(transaction.gasLimit);
    }

    let data: Data;
    if (typeof transaction.data === "undefined") {
      if (typeof transaction.input === "undefined") {
        data = Data.from(transaction.input);
      }
    } else {
      data = Data.from(transaction.data);
    }

    const block = new RuntimeBlock(
      parentHeader.number,
      parentHeader.parentHash,
      blockchain.coinbase,
      gas.toBuffer(),
      parentHeader.timestamp,
      options.miner.difficulty,
      parentHeader.totalDifficulty
    );

    const simulatedTransaction = {
      gas,
      // if we don't have a from address, our caller sut be the configured coinbase address
      from:
        transaction.from == null
          ? blockchain.coinbase
          : Address.from(transaction.from),
      to: transaction.to == null ? null : Address.from(transaction.to),
      gasPrice: Quantity.from(
        transaction.gasPrice == null ? 0 : transaction.gasPrice
      ),
      value:
        transaction.value == null ? null : Quantity.from(transaction.value),
      data,
      block
    };

    return blockchain.simulateTransaction(
      simulatedTransaction,
      parentBlock,
      overrides
    );
  }
  //#endregion

  //#region debug

  /**
   * Attempt to run the transaction in the exact same manner as it was executed
   * on the network. It will replay any transaction that may have been executed
   * prior to this one before it will finally attempt to execute the transaction
   * that corresponds to the given hash.
   *
   * In addition to the hash of the transaction you may give it a secondary
   * optional argument, which specifies the options for this specific call.
   * The possible options are:
   *
   * * `disableStorage`: {boolean} Setting this to `true` will disable storage capture (default = `false`).
   * * `disableMemory`: {boolean} Setting this to `true` will disable memory capture (default = `false`).
   * * `disableStack`: {boolean} Setting this to `true` will disable stack capture (default = `false`).
   *
   * @param transactionHash
   * @param options
   * @returns returns comment
   * @example
   * ```javascript
   * // Simple.sol
   * // // SPDX-License-Identifier: MIT
   * //  pragma solidity ^0.7.4;
   * //
   * //  contract Simple {
   * //      uint256 public value;
   * //      constructor() payable {
   * //          value = 5;
   * //      }
   * //  }
   * const simpleSol = "0x6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
   * const [from] = await provider.request({ method: "eth_accounts", params: [] });
   * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
   * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", data: simpleSol }] });
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   * const transactionTrace = await provider.request({ method: "debug_traceTransaction", params: [txHash] });
   * console.log(transactionTrace);
   * ```
   */
  async debug_traceTransaction(
    transactionHash: string,
    options?: TransactionTraceOptions
  ) {
    return this.#blockchain.traceTransaction(transactionHash, options || {});
  }

  /**
   * Attempts to replay the transaction as it was executed on the network and
   * return storage data given a starting key and max number of entries to return.
   *
   * @param blockHash DATA, 32 Bytes - hash of a block
   * @param transactionIndex QUANTITY - the index of the transaction in the block
   * @param contractAddress DATA, 20 Bytes - address of the contract
   * @param startKey DATA - hash of the start key for grabbing storage entries
   * @param maxResult integer of maximum number of storage entries to return
   * @returns returns a storage object with the keys being keccak-256 hashes of the storage keys,
   * and the values being the raw, unhashed key and value for that specific storage slot. Also
   * returns a next key which is the keccak-256 hash of the next key in storage for continuous downloading.
   */
  async debug_storageRangeAt(
    blockHash: string | Buffer,
    transactionIndex: number,
    contractAddress: string,
    startKey: string | Buffer,
    maxResult: number
  ) {
    return this.#blockchain.storageRangeAt(
      blockHash,
      transactionIndex,
      contractAddress,
      startKey,
      maxResult
    );
  }

  //#endregion

  //#region personal
  /**
   * Returns all the Ethereum account addresses of all keys that have been
   * added.
   * @returns the Ethereum account addresses of all keys that have been added.
   */
  @assertArgLength(0)
  async personal_listAccounts() {
    return this.#wallet.addresses;
  }

  /**
   * Generates a new account with private key. Returns the address of the new
   * account.
   * @param passphrase
   * @returns The new account's address
   */
  @assertArgLength(1)
  async personal_newAccount(passphrase: string) {
    if (typeof passphrase !== "string") {
      throw new Error("missing value for required argument `passphrase`");
    }

    const wallet = this.#wallet;
    const newAccount = wallet.createRandomAccount();
    const address = newAccount.address;
    const strAddress = address.toString();
    const encryptedKeyFile = await wallet.encrypt(
      newAccount.privateKey,
      passphrase
    );
    wallet.encryptedKeyFiles.set(strAddress, encryptedKeyFile);
    wallet.addresses.push(strAddress);
    wallet.knownAccounts.add(strAddress);
    return newAccount.address;
  }

  /**
   * Imports the given unencrypted private key (hex string) into the key store, encrypting it with the passphrase.
   *
   * @param rawKey
   * @param passphrase
   * @returnsReturns the address of the new account.
   */
  @assertArgLength(2)
  async personal_importRawKey(rawKey: string, passphrase: string) {
    if (typeof passphrase !== "string") {
      throw new Error("missing value for required argument `passphrase`");
    }

    const wallet = this.#wallet;
    const newAccount = Wallet.createAccountFromPrivateKey(Data.from(rawKey));
    const address = newAccount.address;
    const strAddress = address.toString();
    const encryptedKeyFile = await wallet.encrypt(
      newAccount.privateKey,
      passphrase
    );
    wallet.encryptedKeyFiles.set(strAddress, encryptedKeyFile);
    wallet.addresses.push(strAddress);
    wallet.knownAccounts.add(strAddress);
    return newAccount.address;
  }

  /**
   * Locks the account. The account can no longer be used to send transactions.
   * @param address
   */
  @assertArgLength(1)
  async personal_lockAccount(address: string) {
    return this.#wallet.lockAccount(address.toLowerCase());
  }

  /**
   * Unlocks the account for use.
   *
   * The unencrypted key will be held in memory until the unlock duration
   * expires. The unlock duration defaults to 300 seconds. An explicit duration
   * of zero seconds unlocks the key until geth exits.
   *
   * The account can be used with eth_sign and eth_sendTransaction while it is
   * unlocked.
   * @param address 20 Bytes - The address of the account to unlock.
   * @param passphrase Passphrase to unlock the account.
   * @param duration (default: 300) Duration in seconds how long the account
   * should remain unlocked for. Set to 0 to disable automatic locking.
   * @returns true if it worked. Throws an error if it did not.
   */
  @assertArgLength(2, 3)
  async personal_unlockAccount(
    address: string,
    passphrase: string,
    duration: number = 300
  ) {
    return this.#wallet.unlockAccount(
      address.toLowerCase(),
      passphrase,
      duration
    );
  }

  /**
   * Validate the given passphrase and submit transaction.
   *
   * The transaction is the same argument as for eth_sendTransaction and
   * contains the from address. If the passphrase can be used to decrypt the
   * private key belogging to tx.from the transaction is verified, signed and
   * send onto the network. The account is not unlocked globally in the node
   * and cannot be used in other RPC calls.
   *
   * @param txData
   * @param passphrase
   */
  @assertArgLength(2)
  async personal_sendTransaction(transaction: any, passphrase: string) {
    let fromString = transaction.from;
    let from: Address;
    if (fromString) {
      from = Address.from(transaction.from);
      fromString = from.toString().toLowerCase();
    }

    if (fromString == null) {
      throw new Error("from not found; is required");
    }

    const wallet = this.#wallet;
    const encryptedKeyFile = wallet.encryptedKeyFiles.get(fromString);
    if (encryptedKeyFile === undefined) {
      throw new Error("no key for given address or file");
    }
    let tx: Transaction;
    if (encryptedKeyFile !== null) {
      const secretKey = await wallet.decrypt(encryptedKeyFile, passphrase);

      tx = new Transaction(transaction, this.#common);
      tx.sign(secretKey);
    } else {
      tx = new Transaction(transaction, this.#common, Transaction.types.fake);
    }

    return this.#blockchain.queueTransaction(tx);
  }
  //#endregion

  //#region rpc
  @assertArgLength(0)
  async rpc_modules() {
    return RPC_MODULES;
  }
  //endregion

  //#region shh

  /**
   * Creates new whisper identity in the client.
   *
   * @returns {DATA, 60 Bytes} result - the address of the new identiy.
   */
  @assertArgLength(0)
  async shh_newIdentity() {
    return "0x00";
  }

  /**
   * Checks if the client hold the private keys for a given identity.
   *
   * @param {DATA, 60 Bytes} address - The identity address to check.
   * @returns returns true if the client holds the privatekey for that identity, otherwise false.
   */
  @assertArgLength(1)
  async shh_hasIdentity(address: string) {
    return false;
  }

  /**
   * Creates a new group.
   *
   * @returns the address of the new group.
   */
  @assertArgLength(0)
  async shh_newGroup() {
    return "0x00";
  }

  /**
   * Adds a whisper identity to the group
   *
   * @param {DATA, 60 Bytes} - The identity address to add to a group.
   * @returns true if the identity was successfully added to the group, otherwise false.
   */
  @assertArgLength(1)
  async shh_addToGroup(address: string) {
    return false;
  }

  /**
   * Creates filter to notify, when client receives whisper message matching the filter options.
   *
   * @param {DATA, 60 Bytes} to -
   * ^(optional) Identity of the receiver. When present it will try to decrypt any incoming message
   *  if the client holds the private key to this identity.
   * @param {Array of DATA} topics - Array of DATA topics which the incoming message's topics should match.
   * @returns returns true if the identity was successfully added to the group, otherwise false.
   */
  @assertArgLength(2)
  async shh_newFilter(to: string, topics: any[]) {
    return false;
  }

  /**
   * Uninstalls a filter with given id. Should always be called when watch is no longer needed.
   * Additonally Filters timeout when they aren't requested with shh_getFilterChanges for a period of time.
   *
   * @param {QUANTITY} id - The filter id. Ex: "0x7"
   * @returns true if the filter was successfully uninstalled, otherwise false.
   */
  @assertArgLength(1)
  async shh_uninstallFilter(id: string) {
    return false;
  }

  /**
   * Polling method for whisper filters. Returns new messages since the last call of this method.
   *
   * @param {QUANTITY} id - The filter id. Ex: "0x7"
   * @returns More Info: https://github.com/ethereum/wiki/wiki/JSON-RPC#shh_getfilterchanges
   */
  @assertArgLength(1)
  async shh_getFilterChanges(id: string) {
    return [];
  }

  /**
   * Get all messages matching a filter. Unlike shh_getFilterChanges this returns all messages.
   *
   * @param {QUANTITY} id - The filter id. Ex: "0x7"
   * @returns See: shh_getFilterChanges
   */
  @assertArgLength(1)
  async shh_getMessages(id: string) {
    return false;
  }

  /**
   * Creates a whisper message and injects it into the network for distribution.
   *
   * @param postData
   * @returns returns true if the message was sent, otherwise false.
   */
  @assertArgLength(1)
  async shh_post(postData: WhisperPostObject) {
    return false;
  }

  /**
   * Returns the current whisper protocol version.
   *
   * @returns The current whisper protocol version
   */
  @assertArgLength(0)
  async shh_version() {
    return "2";
  }
  //#endregion
}
