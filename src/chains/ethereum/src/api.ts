//#region Imports
import { toRpcSig, KECCAK256_NULL, ecsign, hashPersonalMessage } from "ethereumjs-util";
import { TypedData as NotTypedData, signTypedData_v4 } from "eth-sig-util";
import EthereumOptions from "./options";
import { types, Data, Quantity } from "@ganache/utils";
import Blockchain, { BlockchainOptions } from "./blockchain";
import Tag from "./things/tags";
import {VM_EXCEPTION, VM_EXCEPTIONS} from "./things/errors";
import Address from "./things/address";
import Transaction from "./things/transaction";
import Wallet from "./wallet";
import { decode as rlpDecode } from "rlp";

const createKeccakHash = require("keccak");
// Read in the current ganache version from core's package.json
import { version } from "../../../packages/core/package.json";
import { PromiEvent } from "@ganache/utils";
import Emittery from "emittery";
import Common from "ethereumjs-common";
import BlockLogs from "./things/blocklogs";
import EthereumAccount from "ethereumjs-account";
import { Block } from "./components/block-manager";
import CodedError, { ErrorCodes } from "./things/coded-error";
//#endregion

//#region Constants
const BUFFER_EMPTY = Buffer.allocUnsafe(0);
const BUFFER_ZERO = Buffer.from([0]);
const CLIENT_VERSION = `Ganache/v${version}`;
const PROTOCOL_VERSION = Data.from("0x3f");
const RPCQUANTITY_ZERO = Quantity.from("0x0");
const RPC_MODULES = { eth: "1.0", net: "1.0", rpc: "1.0", web3: "1.0", evm: "1.0", personal: "1.0" } as const;
//#endregion

//#region types
type SubscriptionId = string;

type ExtractValuesFromType<T> = { [I in keyof T]: T[I] }[keyof T];
type TypedData = Exclude<Parameters<typeof signTypedData_v4>[1]["data"], NotTypedData>;
enum FilterTypes {
  log,
  block,
  pendingTransaction
};
type Topic = string|string[];
type FilterArgs = {address?: string | string[], topics?: Topic[], fromBlock?: string | Tag, toBlock?: string | Tag};
//#endregion

//#region helpers
function parseFilterDetails(filter: Pick<FilterArgs, "address" | "topics">) {
  // `filter.address` may be a single address or an array
  const addresses = filter.address ? (Array.isArray(filter.address) ? filter.address : [filter.address]).map(a => Address.from(a.toLowerCase()).toBuffer()) : [];
  const topics = filter.topics ? filter.topics : [];
  return {addresses, topics};
}
function parseFilterRange(filter: Pick<FilterArgs, "fromBlock" | "toBlock">, blockchain: Blockchain) {
  const fromBlock = blockchain.blocks.getEffectiveNumber(filter.fromBlock || "latest");
  const latestBlockNumberBuffer = blockchain.blocks.latest.value.header.number;
  const latestBlock = Quantity.from(latestBlockNumberBuffer);
  const latestBlockNumber = latestBlock.toNumber();
  const toBlock = blockchain.blocks.getEffectiveNumber(filter.toBlock || "latest");
  let toBlockNumber: number;
  // don't search after the "latest" block, unless it's "pending", of course.
  if (toBlock > latestBlock) {
    toBlockNumber = latestBlockNumber;
  } else {
    toBlockNumber = toBlock.toNumber();
  }
  return {
    fromBlock,
    toBlock,
    toBlockNumber
  }
}
function parseFilter(filter: FilterArgs = {address: [], topics: []}, blockchain: Blockchain) {
  const {addresses, topics} = parseFilterDetails(filter);
  const {fromBlock, toBlock, toBlockNumber} = parseFilterRange(filter, blockchain);

  return {
    addresses,
    fromBlock,
    toBlock,
    toBlockNumber,
    topics
  };
}

function assertExceptionalTransactions(transactions: Transaction[]) {
  let baseError = null;
  let errors: string[];
  const data = {};

  transactions.forEach(transaction => {
    if (transaction.execException) {
      if (baseError) {
        baseError = VM_EXCEPTIONS;
        errors.push(`${Data.from(transaction.hash(), 32).toString()}: ${transaction.execException}\n`);
        data[transaction.execException.data.hash] = transaction.execException.data;
      } else {
        baseError = VM_EXCEPTION;
        errors = [ transaction.execException.message ];
        data[transaction.execException.data.hash] = transaction.execException.data;
      }
    }
  });

  if (baseError) {
    const err = new Error(baseError + errors.join("\n"));
    (err as any).data = data
    throw err;
  }
}

function assertArgLength(min: number, max: number = min) {
  return function(_target, _name, descriptor) {
    const original = descriptor.value;
    descriptor.value = function() {
      const length = arguments.length;
      if (length < min || length > max) throw new Error("Incorrect number of arguments.");
      return Reflect.apply(original, this, arguments);
    };
    return descriptor;
  };
}

export default class EthereumApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  readonly #getId = ((id) => () => Quantity.from(++id))(0);
  readonly #common: Common;
  readonly #filters = new Map<string, {type: FilterTypes, updates: any[], unsubscribe: Emittery.UnsubscribeFn, filter: FilterArgs}>();
  readonly #subscriptions = new Map<string, Emittery.UnsubscribeFn>();
  readonly #blockchain: Blockchain;
  readonly #options: EthereumOptions;
  readonly #wallet: Wallet;

  /**
   * This is the Ethereum API that the provider interacts with.
   * The only methods permitted on the prototype are the supported json-rpc
   * methods.
   * @param options
   * @param ready Callback for when the API is fully initialized
   */
  constructor(options: EthereumOptions, emitter: Emittery.Typed<{message: any}, "connect" | "disconnect">) {
    const opts = (this.#options = options);

    const {initialAccounts} = this.#wallet = new Wallet(opts);

    const blockchainOptions = options as BlockchainOptions;
    blockchainOptions.initialAccounts = initialAccounts;
    blockchainOptions.coinbase = initialAccounts[0];
    this.#common = blockchainOptions.common = Common.forCustomChain(
      "mainnet", // TODO needs to match chain id
      {
        name: "ganache",
        networkId: options.networkId,
        chainId: options.chainId,
        comment: "Local test network"
      },
      options.hardfork
    );
    const blockchain = (this.#blockchain = new Blockchain(blockchainOptions));
    blockchain.on("start", () => {
      emitter.emit("connect");
    });
    emitter.on("disconnect", () => {
      return blockchain.stop();
    });
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
  async db_putString(dbName: string, key: string, value: string) {
    return false;
  };

  /**
   * Returns string from the local database
   *
   * @param {String} dbName - Database name.
   * @param {String} key - Key name.
   * @returns The previously stored string.
   */
  async db_getString(dbName: string, key: string) {
    return "";
  };

  /**
   * Stores binary data in the local database.
   *
   * @param {String} dbName - Database name.
   * @param {String} key - Key name.
   * @param {DATA} data - Data to store.
   * @returns true if the value was stored, otherwise false.
   */
  async db_putHex(dbName: string, key: string, data: string) {
    return false;
  };

  /**
   * Returns binary data from the local database
   *
   * @param {String} dbName - Database name.
   * @param {String} key - Key name.
   * @returns The previously stored data.
   */
  async db_getHex(dbName: string, key: string) {
    return "0x00";
  };
  //#endregion

  //#region bzz
  async bzz_hive() {
    return [] as any[];
  }

  async bzz_info() {
    return [] as any[];
  }
  //#endregion

  //#region evm
  /**
   * Force a single block to be mined.
   * 
   * Mines a block independent of whether or not mining is started or stopped.
   * Will mine an empty block if there are no available transactions to mine.
   * 
   * @param timestamp? the timestamp a block should setup as the mining time.
   */
  @assertArgLength(0, 1)
  async evm_mine(timestamp?: number) {
    const transactions = await this.#blockchain.mine(-1, timestamp, true);
    if (this.#options.vmErrorsOnRPCResponse) {
      assertExceptionalTransactions(transactions);
    }

    return "0x0";
  }

  /**
   * Sets the given account's nonce to the specified value. Mines a new block
   * before returning.
   * 
   * Warning: this will result in an invalid state tree.
   * 
   * @param address 
   * @param nonce
   * @returns true if it worked
  */
  async evm_setAccountNonce(address: string, nonce: string) {
    return new Promise<boolean>((resolve, reject) => {
      const buffer = Address.from(address).toBuffer();
      const blockchain = this.#blockchain;
      const stateManager = blockchain.vm.stateManager;
      stateManager.getAccount(buffer, (err: Error, account: EthereumAccount) => {
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
         
          blockchain.mine(0).then(() => resolve(true), reject);
        });
      });
    });
  }

  /**
   * Jump forward in time by the given amount of time, in seconds.
   * @param seconds Must be greater than or equal to `0`
   * @returns Returns the total time adjustment, in seconds.
   */
  async evm_increaseTime(seconds: number) {
    return Math.floor(this.#blockchain.increaseTime(seconds * 1000) / 1000);
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
  async evm_setTime(time?: Date | number) {
    return Math.floor(this.#blockchain.setTime(+time) / 1000);
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
   * <div class="runkit-example">
   * const snapshotId = await provider.send("evm_snapshot");
   * const isReverted = await provider.send("evm_revert", [snapshotId]);
   * </div>
   * 
   * @example
   * <div class="runkit-example">
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
   * </div>
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
   * <div class="runkit-example">
   * const snapshotId = await provider.send("evm_snapshot");
   * </div>
   * 
   * @example
   * <div class="runkit-example">
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
   * </div>
   */
  async evm_snapshot() {
    return Quantity.from(this.#blockchain.snapshot());
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
  async miner_start(threads: number = 1) {
    if (this.#options.legacyInstamine === true) {
      const transactions = await this.#blockchain.resume(threads);
      if (transactions != null && this.#options.vmErrorsOnRPCResponse) {
        assertExceptionalTransactions(transactions as any);
      }
    } else {
      this.#blockchain.resume(threads);
    }
    return true;
  }

  /**
   * Stop the CPU mining operation.
   */
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
  async miner_setGasPrice(number: Quantity) {
    this.#options.gasPrice = number;
    return true;
  }

  /**
   * Sets the etherbase, where mining rewards will go.
   * @param address 
   */
  async miner_setEtherbase(address: string) {
    this.#blockchain.coinbase = Address.from(address);
    return true;
  }
  //#endregion

  //#region web3
  /**
   * Returns the current client version.
   * @returns The current client version.
   */
  async web3_clientVersion() {
    return CLIENT_VERSION;
  }

  /**
   * Returns Keccak-256 (not the standardized SHA3-256) of the given data.
   * @param {data} the data to convert into a SHA3 hash.
   * @returns The SHA3 result of the given string.
   */
  async web3_sha3(data: string) {
    return Data.from(createKeccakHash("keccak256").update(data).digest());
  }
  //#endregion

  //#region net
  /**
   * Returns the current network id.
   * @returns The current network id. This value should NOT be JSON-RPC
   * Quantity/Data encoded.
   */
  async net_version() {
    return this.#options.networkId.toString();
  }

  /**
   * Returns true if client is actively listening for network connections.
   * @returns true when listening, otherwise false.
   */
  async net_listening() {
    // TODO: this should return false when ganache isn't used with a server, or
    // or while the server is still initializing.
    return true;
  }

  /**
   * Returns number of peers currently connected to the client.
   * @returns integer of the number of connected peers.
   */
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
  async eth_estimateGas() {
    // TODO: do this for real
    return Quantity.from(6721975);
  }

  /**
   * Returns the current ethereum protocol version.
   * @returns The current ethereum protocol version.
   */
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
  async eth_syncing() {
    return false;
  }

  /**
   * Returns the client coinbase address.
   * @returns 20 bytes - the current coinbase address.
   */
  async eth_coinbase() {
    return this.#blockchain.coinbase;
  }

  /**
   * Returns information about a block by block number.
   * @param number QUANTITY|TAG - integer of a block number, or the string "earliest", "latest" or "pending", as in th e default block parameter.
   * @param transactions Boolean - If true it returns the full transaction objects, if false only the hashes of the transactions.
   * @returns the block, `null` if the block doesn't exist.
   */
  async eth_getBlockByNumber(number: string | Buffer, transactions = false) {
    const block = await this.#blockchain.blocks.get(number).catch(_ => null);
    return block ? block.toJSON(transactions) : null;
  }

  /**
   * Returns information about a block by block hash.
   * @param number QUANTITY|TAG - integer of a block number, or the string "earliest", "latest" or "pending", as in th e default block parameter.
   * @param transactions Boolean - If true it returns the full transaction objects, if false only the hashes of the transactions.
   * @returns Block
   */
  async eth_getBlockByHash(hash: string | Buffer, transactions = false) {
    const block = await this.#blockchain.blocks.getByHash(hash).catch(_ => null);
    return block ? block.toJSON(transactions) : null;
  }

  /**
   * Returns the number of transactions in a block from a block matching the given block number.
   * @param number QUANTITY|TAG - integer of a block number, or the string "earliest", "latest" or "pending", as in the default block parameter.
   */
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
  async eth_getBlockTransactionCountByHash(hash: string | Buffer) {
    const number = await this.#blockchain.blocks.getNumberFromHash(hash);
    if (number) {
      return this.eth_getBlockTransactionCountByNumber(number);
    } else {
      return null;
    }
  }

  async eth_getCompilers() {
    return [] as string[];
  }

  /**
   * Returns information about a transaction by block hash and transaction index position.
   * @param hash DATA, 32 Bytes - hash of a block.
   * @param index QUANTITY - integer of the transaction index position.
   */
  async eth_getTransactionByBlockHashAndIndex(hash: string | Buffer, index: string) {
    const block = await this.eth_getBlockByHash(hash, true);
    if (block) {
      const tx = block.transactions[parseInt(index, 10)];
      if (tx) return tx;
    }
    return null;
  }

  /**
   * Returns information about a transaction by block number and transaction index position.
   * @param number QUANTITY|TAG - a block number, or the string "earliest", "latest" or "pending", as in the default block parameter.
   * @param index QUANTITY - integer of the transaction index position.
   */
  async eth_getTransactionByBlockNumberAndIndex(number: string | Buffer, index: string) {
    const block = await this.eth_getBlockByNumber(number, true);
    return block.transactions[parseInt(index, 10)];
  }

  /**
   * Returns the number of uncles in a block from a block matching the given block hash.
   * @param hash DATA, 32 Bytes - hash of a block.
   */
  async eth_getUncleCountByBlockHash(hash: string | Buffer) {
    return RPCQUANTITY_ZERO
  }

  /**
   * Returns the number of uncles in a block from a block matching the given block hash.
   * @param hash DATA, 32 Bytes - hash of a block.
   */
  async eth_getUncleCountByBlockNumber(number: string | Buffer) {
    return RPCQUANTITY_ZERO
  }

  /**
   * Returns information about a uncle of a block by hash and uncle index position.
   *
   * @param hash - hash of a block
   * @param index - the uncle's index position.
   */
  async eth_getUncleByBlockHashAndIndex(hash: Data, index: Quantity) {
    return null as ReturnType<EthereumApi["eth_getBlockByHash"]>;
  }

  /**
   * Returns information about a uncle of a block by hash and uncle index position.
   *
   * @param blockNumber - a block number, or the string "earliest", "latest" or "pending", as in the default block parameter.
   * @param uncleIndex - the uncle's index position.
   */
  async eth_getUncleByBlockNumberAndIndex(blockNumber: Buffer | Tag = Tag.LATEST, uncleIndex: Quantity) {
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
  async eth_getWork(filterId: Quantity) {
    return [] as [string, string, string] | [];
  };

  /**
   * Used for submitting a proof-of-work solution
   *
   * @param {DATA, 8 Bytes} nonce - The nonce found (64 bits)
   * @param {DATA, 32 Bytes} powHash - The header's pow-hash (256 bits)
   * @param {DATA, 32 Bytes} digest - The mix digest (256 bits)
   * @returns `true` if the provided solution is valid, otherwise `false`.
   */
  async eth_submitWork(nonce: Data, powHash: Data, digest: Data) {
    return false;
  };

  /**
   * Used for submitting mining hashrate.
   *
   * @param {String} hashRate - a hexadecimal string representation (32 bytes) of the hash rate
   * @param {String} clientID - A random hexadecimal(32 bytes) ID identifying the client
   * @returns `true` if submitting went through succesfully and `false` otherwise.
   */
  async eth_submitHashrate(hashRate: string, clientID: string) {
    return false;
  };

  /**
   * Returns true if client is actively mining new blocks.
   * @returns returns true of the client is mining, otherwise false.
   */
  async eth_mining() {
    return this.#blockchain.isMining();
  }

  /**
   * Returns the number of hashes per second that the node is mining with.
   * @returns number of hashes per second.
   */
  async eth_hashrate() {
    return RPCQUANTITY_ZERO;
  }

  /**
   * Returns the current price per gas in wei.
   * @returns integer of the current gas price in wei.
   */
  async eth_gasPrice() {
    return this.#options.gasPrice;
  }

  /**
   * Returns a list of addresses owned by client.
   * @returns Array of 20 Bytes - addresses owned by the client.
   */
  async eth_accounts() {
    return this.#wallet.addresses;
  }

  /**
   * Returns the number of most recent block.
   * @returns integer of the current block number the client is on.
   */
  async eth_blockNumber() {
    const latest = await this.#blockchain.blocks.get(Tag.LATEST);
    return Quantity.from(latest.value.header.number);
  }

  /**
   * Returns the currently configured chain id, a value used in
   * replay-protected transaction signing as introduced by EIP-155.
   * @returns The chain id as a string.
   * @EIP [155](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md)
   */
  async eth_chainId() {
    return Quantity.from(this.#options.chainId);
  }

  /**
   * Returns the balance of the account of given address.
   * @param address 20 Bytes - address to check for balance.
   * @param blockNumber integer block number, or the string "latest", "earliest"
   *  or "pending", see the default block parameter
   */
  async eth_getBalance(address: string, blockNumber: Buffer | Tag = Tag.LATEST) {
    const chain = this.#blockchain;
    const account = await chain.accounts.get(Address.from(address), blockNumber);
    return account.balance;
  }

  /**
   * Returns code at a given address.
   * 
   * @param address 20 Bytes - address
   * @param blockNumber integer block number, or the string "latest", "earliest" or "pending", see the default block parameter
   * @returns the code from the given address.
   */
  async eth_getCode(address: Buffer, blockNumber: Buffer | Tag = Tag.LATEST) {
    const blockchain = this.#blockchain;
    const blockProm = blockchain.blocks.getRaw(blockNumber);

    const trie = blockchain.trie.copy();
    const getFromTrie = (address: Buffer): Promise<Buffer> =>
      new Promise((resolve, reject) => {
        trie.get(address, (err, data) => {
          if (err) return void reject(err);
          resolve(data);
        });
      });
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

    const addressDataPromise = getFromTrie(Address.from(address).toBuffer());

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
      trie.getRaw(codeHash, (err, data) => {
        if (err) return void reject(err);
        resolve(Data.from(data));
      });
    })
  }

  /**
   * Returns the value from a storage position at a given address.
   * @param data 20 Bytes - address of the storage.
   * @param quantity integer of the position in the storage.
   * @param blockNumber integer block number, or the string "latest", "earliest"
   *  or "pending", see the default block parameter
   */
  async eth_getStorageAt(
    address: string,
    position: bigint | number,
    blockNumber: string | Buffer | Tag = Tag.LATEST
  ) {
    const blockProm = this.#blockchain.blocks.getRaw(blockNumber);

    const trie = this.#blockchain.trie.copy();
    const getFromTrie = (address: Buffer): Promise<Buffer> =>
      new Promise((resolve, reject) => {
        trie.get(address, (err, data) => {
          if (err) return void reject(err);
          resolve(data);
        });
      });
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

    const addressDataPromise = getFromTrie(Address.from(address).toBuffer());

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
    const value = await getFromTrie(paddedPosBuff);
    return Data.from(value);
  }

  /**
   * Returns the information about a transaction requested by transaction hash.
   *
   * @param transactionHash 32 Bytes - hash of a transaction
   */
  async eth_getTransactionByHash(transactionHash: string) {
    const chain = this.#blockchain;
    const hashBuffer = Data.from(transactionHash).toBuffer();
    const transaction = await chain.transactions.get(hashBuffer);
    if (transaction == null) {
      // maybe it is pending?
      const tx = chain.transactions.transactionPool.find(hashBuffer);
      if (tx === null) return null;
      return tx.toJSON(null);
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
  async eth_getTransactionReceipt(transactionHash: string) {
    const blockchain = this.#blockchain;
    const transactionPromise = blockchain.transactions.get(transactionHash);
    const receiptPromise = blockchain.transactionReceipts.get(transactionHash);
    const blockPromise = transactionPromise.then(t => (t ? blockchain.blocks.get(t._blockNum) : null));
    const [transaction, receipt, block] = await Promise.all([transactionPromise, receiptPromise, blockPromise]);
    if (transaction) {
      return receipt.toJSON(block, transaction);
    } else {
      return null;
    }
  }

  /**
   * Creates new message call transaction or a contract creation, if the data field contains code.
   * @param transaction
   * @returns The transaction hash
   */
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
      const msg = isKnownAccount ? "authentication needed: password or unlock" : "sender account not recognized";
      throw new Error(msg);
    }

    let type: ExtractValuesFromType<typeof Transaction.types>;
    if (isKnownAccount) {
      type = Transaction.types.none;
    } else {
      type = Transaction.types.fake;
    }

    const tx = Transaction.fromJSON(transaction, this.#common, type);
    if (tx.gasLimit.length === 0) {
      tx.gasLimit = this.#options.defaultTransactionGasLimit.toBuffer();
    }

    if (tx.gasPrice.length === 0) {
      const gasPrice = this.#options.gasPrice;
      if (gasPrice instanceof Quantity) {
        tx.gasPrice = gasPrice.toBuffer();
      } else {
        tx.gasPrice = Quantity.from(gasPrice as any).toBuffer();
      }
    }

    if (tx.value.length === 0) {
      tx.value = Buffer.from([0]);
    }

    if (tx.to.length === 0 || tx.to.equals(BUFFER_ZERO)) {
      tx.to = BUFFER_EMPTY;
    }

    if (isUnlockedAccount) {
      const secretKey = wallet.unlockedAccounts.get(fromString);
      return this.#blockchain.queueTransaction(tx, secretKey);
    }

    return this.#blockchain.queueTransaction(tx);
  }

  /**
   * Creates new message call transaction or a contract creation for signed transactions.
   * @param transaction
   * @returns The transaction hash
   */
  async eth_sendRawTransaction(transaction: string) {
    const tx = new Transaction(transaction, {common: this.#common}, Transaction.types.signed);
    return this.#blockchain.queueTransaction(tx)
  }

  /**
   * The sign method calculates an Ethereum specific signature with:
   * `sign(keccak256("\x19Ethereum Signed Message:\n" + message.length + message)))`.
   * 
   * By adding a prefix to the message makes the calculated signature 
   * recognisable as an Ethereum specific signature. This prevents misuse where a malicious DApp can sign arbitrary data (e.g. transaction) and use the signature to impersonate the victim.
   * 
   * Note the address to sign with must be unlocked.
   * 
   * @param account address
   * @param data message to sign
   * @returns Signature
   */
  async eth_sign(address: string | Buffer, message: string | Buffer) {
    const account = Address.from(address).toString().toLowerCase();
    const wallet = this.#wallet;
    const privateKey = wallet.unlockedAccounts.get(account);
    if (privateKey == null) {
      throw new Error("cannot sign data; no private key");
    }

    const messageHash = hashPersonalMessage(Data.from(message).toBuffer());
    const signature = ecsign(messageHash, privateKey.toBuffer());
    return toRpcSig(signature.v, signature.r, signature.s, +this.#options.chainId);
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
  eth_subscribe(subscriptionName: "newHeads" | "newPendingTransactions" | "syncing" | "logs"): PromiEvent<Quantity>
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
  eth_subscribe(subscriptionName: "logs", options: Pick<FilterArgs, "address" | "topics">): PromiEvent<Quantity>
  eth_subscribe(subscriptionName: "newHeads" | "newPendingTransactions" | "syncing" | "logs", options?: Pick<FilterArgs, "address" | "topics">) {
    const subscriptions = this.#subscriptions;
    switch (subscriptionName) {
      case "newHeads": {
        const subscription = this.#getId();
        const promiEvent = PromiEvent.resolve(subscription);

        const unsubscribe = this.#blockchain.on("block", (block: Block) => {
          const value = block.value;
          const header = value.header;
          const result = {
            "logsBloom":        Data.from(header.bloom, 256), // TODO: pending block
            "miner":            Address.from(header.coinbase),
            "difficulty":       Quantity.from(header.difficulty),
            "extraData":        Data.from(header.extraData),
            "gasLimit":         Quantity.from(header.gasLimit),
            "gasUsed":          Quantity.from(header.gasUsed),
            "hash":             Data.from(value.hash(), 32), // TODO: pending block
            "mixHash":          Data.from(header.mixHash, 32),
            "nonce":            Data.from(header.nonce, 8), // TODO: pending block
            "number":           Quantity.from(header.number, true), // TODO: pending block
            "parentHash":       Data.from(header.parentHash, 32),
            "receiptsRoot":     Data.from(header.receiptTrie, 32),
            "stateRoot":        Data.from(header.stateRoot, 32),
            "timestamp":        Quantity.from(header.timestamp),
            "transactionsRoot": Data.from(header.transactionsTrie, 32),
            "sha3Uncles":       Data.from(header.uncleHash, 32)
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

        const { addresses, topics } = options ? parseFilterDetails(options) : {addresses: [], topics: []};
        const unsubscribe = this.#blockchain.on("blockLogs", (blockLogs: BlockLogs) => {
            // TODO: move the JSON stringification closer to where the message
            // is actually sent to the listener
          const result = JSON.parse(JSON.stringify([...blockLogs.filter(addresses, topics)]));
          promiEvent.emit("message", {
            type: "eth_subscription",
            data: {
              result,
              subscription: subscription.toString()
            }
          });
        });
        subscriptions.set(subscription.toString(), unsubscribe);
        return promiEvent;
      }
      case "newPendingTransactions": {
        const subscription = this.#getId();
        const promiEvent = PromiEvent.resolve(subscription);

        const unsubscribe = this.#blockchain.on("pendingTransaction", (transaction: Transaction) => {
          const result = Data.from(transaction.hash(), 32).toString();
          promiEvent.emit("message", {
            type: "eth_subscription",
            data: {
              result,
              subscription: subscription.toString()
            }
          });
        });
        subscriptions.set(subscription.toString(), unsubscribe);
        return promiEvent;
      }
      case "syncing": {
        // TODO: ?
        const subscription = this.#getId();
        const promiEvent = PromiEvent.resolve(subscription);
        
        this.#subscriptions.set(subscription.toString(), () => {});
        return promiEvent;
      }
      default:
        throw new CodedError(`no \"${subscriptionName}\" subscription in eth namespace`, ErrorCodes.METHOD_NOT_FOUND);
    }
  }


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
  async eth_newBlockFilter() {
    const unsubscribe = this.#blockchain.on("block", (block: Block) => {
      value.updates.push(Data.from(block.value.hash(), 32));
    });
    const value = {updates: [] as Data[], unsubscribe, filter: null as FilterArgs, type: FilterTypes.block};
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
  async eth_newPendingTransactionFilter() {
    const unsubscribe = this.#blockchain.on("pendingTransaction", (transaction: Transaction) => {
      value.updates.push(Data.from(transaction.hash(), 32));
    });
    const value = {updates: [] as Data[], unsubscribe, filter: null as FilterArgs, type: FilterTypes.pendingTransaction};
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
  async eth_newFilter(filter: FilterArgs = {}) {
    const blockchain = this.#blockchain;
    const { addresses, topics } = parseFilterDetails(filter);
    const unsubscribe = blockchain.on("blockLogs", (blockLogs: BlockLogs) => {
      const blockNumber = blockLogs.blockNumber;
      // everytime we get a blockLogs message we re-check what the filter's
      // range is. We do this because "latest" isn't the latest block at the
      // time the filter was set up, rather it is the actual latest *mined* 
      // block (that is: not pending)
      const {fromBlock, toBlock} = parseFilterRange(filter, blockchain);
      if (fromBlock <= blockNumber && toBlock >= blockNumber) {
        value.updates.push(...blockLogs.filter(addresses, topics));
      }
    });
    const value = {updates: [] as any[], unsubscribe, filter, type: FilterTypes.log};
    const filterId = this.#getId();
    this.#filters.set(filterId.toString(), value);
    return filterId;
  }

  /**
   * Polling method for a filter, which returns an array of logs, block hashes,
   * or transactions hashes, depending on the filter type, which occurred since
   * last poll.
   * 
   * @param filterId the filter id.
   * @returns an array of logs, block hashes, or transactions hashes, depending
   * on the filter type, which occurred since last poll.
   */
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
  async eth_getLogs(filter: FilterArgs) {
    const blockchain = this.#blockchain;
    const blockLogs = blockchain.blockLogs;
    const {addresses, topics, fromBlock, toBlockNumber} = parseFilter(filter, blockchain);
    
    const pendingLogsPromises: Promise<BlockLogs>[] = [blockLogs.get(fromBlock.toBuffer())];

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
      const filteredBlockLogs: ReturnType<typeof BlockLogs["logToJSON"]>[] = [];
      blockLogsRange.forEach(blockLogs => {
        // TODO(perf): this loops over all expectedAddresseses for every block.
        // Make it loop only once.
        if (blockLogs) filteredBlockLogs.push(...blockLogs.filter(addresses, topics));
      });
      return filteredBlockLogs;
    });
  }

  /**
   * Returns the number of transactions sent from an address.
   * 
   * @param address
   * @param blockNumber integer block number, or the string "latest", "earliest"
   * or "pending", see the default block parameter
   * @returns integer of the number of transactions sent from this address.
   */
  async eth_getTransactionCount(address: string, blockNumber: Buffer | Tag = Tag.LATEST) {
    const account = await this.#blockchain.accounts.get(Address.from(address), blockNumber);
    if (!account) return null;
    return account.nonce;
  }


  /**
   * Executes a new message call immediately without creating a transaction on the block chain.
   * 
   * @param transaction
   * @param blockNumber
   * 
   * @returns the return value of executed contract.
   */
  async eth_call(transaction: any, blockNumber: string | Buffer | Tag = Tag.LATEST) {
    const blockchain = this.#blockchain;
    const blocks = blockchain.blocks;
    const parentBlock = await blocks.get(blockNumber);
    const parentHeader = parentBlock.value.header;
    const options = this.#options;

    if (!transaction.gasLimit) {
      if (!transaction.gas) {
        // eth_call isn't subject to regular transaction gas limits
        transaction.gasLimit = transaction.gas = options.callGasLimit.toString();
      } else {
        transaction.gasLimit = transaction.gas;
      }
    } else {
      transaction.gas = transaction.gasLimit;
    }

    const newBlock = blocks.createBlock({
      number: parentHeader.number,
      timestamp: parentHeader.timestamp,
      parentHash: parentHeader.parentHash,
      coinbase: blockchain.coinbase.toBuffer(),
      // gas estimates and eth_calls aren't subject to regular block gas limits
      gasLimit: transaction.gas
    });
    return blockchain.simulateTransaction(transaction, parentBlock, newBlock);
  }
  //#endregion

  //#region personal
  /**
   * Returns all the Ethereum account addresses of all keys that have been
   * added.
   * @returns the Ethereum account addresses of all keys that have been added.
   */
  async personal_listAccounts() {
    return this.#wallet.addresses;
  };

  /**
   * Generates a new account with private key. Returns the address of the new
   * account.
   * @param passphrase
   * @returns The new account's address
   */
  async personal_newAccount(passphrase: string) {
    if (typeof passphrase !== "string") {
      throw new Error("missing value for required argument `passphrase`");
    }

    const wallet = this.#wallet;
    const newAccount = wallet.createRandomAccount(this.#options.mnemonic);
    const address = newAccount.address;
    const strAddress = address.toString();
    const encryptedKeyFile = await wallet.encrypt(newAccount.privateKey, passphrase);
    wallet.encryptedKeyFiles.set(strAddress, encryptedKeyFile);
    wallet.addresses.push(strAddress);
    wallet.knownAccounts.add(strAddress);
    return newAccount.address;
  };

  /**
   * Imports the given unencrypted private key (hex string) into the key store, encrypting it with the passphrase.
   * 
   * @param rawKey
   * @param passphrase
   * @returnsReturns the address of the new account.
   */
  async personal_importRawKey(rawKey: string, passphrase: string) {
    if (typeof passphrase !== "string") {
      throw new Error("missing value for required argument `passphrase`");
    }

    const wallet = this.#wallet;
    const newAccount = Wallet.createAccountFromPrivateKey(Data.from(rawKey));
    const address = newAccount.address;
    const strAddress = address.toString();
    const encryptedKeyFile = await wallet.encrypt(newAccount.privateKey, passphrase);
    wallet.encryptedKeyFiles.set(strAddress, encryptedKeyFile);
    wallet.addresses.push(strAddress);
    wallet.knownAccounts.add(strAddress);
    return newAccount.address;
  };

  /**
   * Locks the account. The account can no longer be used to send transactions.
   * @param address 
   */
  async personal_lockAccount(address: string) {
    return this.#wallet.lockAccount(address.toLowerCase());
  };

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
   * should remain unlocked for.
   * @returns true if it worked. Throws an error if it did not.
   */
  async personal_unlockAccount(address: string, passphrase: string, duration: number = 300) {
    return this.#wallet.unlockAccount(address.toLowerCase(), passphrase, duration);
  };

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
    const options = {common: this.#common}
    if (encryptedKeyFile !== null) {
      const secretKey = await wallet.decrypt(encryptedKeyFile, passphrase);

      tx = new Transaction(transaction, options);
      tx.sign(secretKey);
    } else {
      tx = new Transaction(transaction, options, Transaction.types.fake);
    }

    return this.#blockchain.queueTransaction(tx);
  };
  //#endregion

  //#region rpc
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
  async shh_newIdentity() {
    return "0x00";
  };

  /**
   * Checks if the client hold the private keys for a given identity.
   *
   * @param {DATA, 60 Bytes} address - The identity address to check.
   * @returns returns true if the client holds the privatekey for that identity, otherwise false.
   */
  async shh_hasIdentity(address: string) {
    return false;
  };

  /**
   * Creates a new group.
   *
   * @returns the address of the new group.
   */
  async shh_newGroup() {
    return "0x00";
  };

  /**
   * Adds a whisper identity to the group
   *
   * @param {DATA, 60 Bytes} - The identity address to add to a group.
   * @returns true if the identity was successfully added to the group, otherwise false.
   */
  async shh_addToGroup(address: string) {
    return false;
  };

  /**
   * Creates filter to notify, when client receives whisper message matching the filter options.
   *
   * @param {DATA, 60 Bytes} to -
   * ^(optional) Identity of the receiver. When present it will try to decrypt any incoming message
   *  if the client holds the private key to this identity.
   * @param {Array of DATA} topics - Array of DATA topics which the incoming message's topics should match.
   * @returns returns true if the identity was successfully added to the group, otherwise false.
   */
  async shh_newFilter(to: string, topics: any[]) {
    return false;
  };

  /**
   * Uninstalls a filter with given id. Should always be called when watch is no longer needed.
   * Additonally Filters timeout when they aren't requested with shh_getFilterChanges for a period of time.
   *
   * @param {QUANTITY} id - The filter id. Ex: "0x7"
   * @returns true if the filter was successfully uninstalled, otherwise false.
   */
  async shh_uninstallFilter(id: string) {
    return false;
  };

  /**
   * Polling method for whisper filters. Returns new messages since the last call of this method.
   *
   * @param {QUANTITY} id - The filter id. Ex: "0x7"
   * @returns More Info: https://github.com/ethereum/wiki/wiki/JSON-RPC#shh_getfilterchanges
   */
  async shh_getFilterChanges(id: string) {
    return [] as any[];
  };

  /**
   * Get all messages matching a filter. Unlike shh_getFilterChanges this returns all messages.
   *
   * @param {QUANTITY} id - The filter id. Ex: "0x7"
   * @returns See: shh_getFilterChanges
   */
  async shh_getMessages(id: string) {
    return false;
  };
  /**
 * Sends a whisper message.
 *
 * @param {DATA, 60 Bytes} from - (optional) The identity of the sender.
 * @param {DATA, 60 Bytes} to -
 *  ^(optional) The identity of the receiver. When present whisper will encrypt the message so that
 *  only the receiver can decrypt it.
 * @param {Array of DATA} topics - Array of DATA topics, for the receiver to identify messages.
 * @param {DATA} payload - The payload of the message.
 * @param {QUANTITY} priority - The integer of the priority in a range from ... (?).
 * @param {QUANTITY} ttl - integer of the time to live in seconds.
 * @returns returns true if the message was sent, otherwise false.
 */
  async shh_post(from: string, to: string, topics: any[], payload: string, priority: string, ttl: string) {
    return false;
  }

  /**
   * Returns the current whisper protocol version.
   * 
   * @returns The current whisper protocol version
   */
  async shh_version() {
    return "2";
  }
  //#endregion
}
