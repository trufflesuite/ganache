//#region Imports
import {
  Tag,
  BlockLogs,
  VM_EXCEPTION,
  VM_EXCEPTIONS,
  CodedError,
  DATA,
  InternalFilter,
  FilterTypes,
  QUANTITY,
  EthereumRawAccount
} from "@ganache/ethereum-utils";
import { BaseFeeHeader, Block, RuntimeBlock } from "@ganache/ethereum-block";
import {
  Transaction,
  TransactionFactory,
  TypedTransaction
} from "@ganache/ethereum-transaction";
import {
  toRpcSig,
  ecsign,
  hashPersonalMessage,
  KECCAK256_NULL
} from "ethereumjs-util";
import { signTypedData_v4 } from "eth-sig-util";
import {
  Data,
  Heap,
  Quantity,
  PromiEvent,
  Api,
  keccak,
  JsonRpcErrorCode
} from "@ganache/utils";
import Blockchain from "./blockchain";
import { EthereumInternalOptions } from "@ganache/ethereum-options";
import Wallet from "./wallet";

import Emittery from "emittery";
import estimateGas from "./helpers/gas-estimator";
import { assertArgLength } from "./helpers/assert-arg-length";
import { parseFilterDetails, parseFilterRange } from "./helpers/filter-parsing";
import { decode } from "@ganache/rlp";
import { Address } from "@ganache/ethereum-address";
import { GanacheRawBlock } from "@ganache/ethereum-block";
import { Capacity } from "./miner/miner";
import { Ethereum } from "./api-types";
import {
  AccessList,
  AccessLists
} from "@ganache/ethereum-transaction/src/access-lists";
import Common from "@ethereumjs/common";
import { SimulationTransaction } from "./helpers/simulation-handler";

async function autofillDefaultTransactionValues(
  tx: TypedTransaction,
  eth_estimateGas: (
    tx: Ethereum.Transaction,
    tag: QUANTITY | Ethereum.Tag
  ) => Promise<Quantity>,
  eth_maxPriorityFeePerGas: () => Promise<Quantity>,
  transaction: Ethereum.Transaction,
  blockchain: Blockchain,
  options: EthereumInternalOptions
) {
  if (tx.gas.isNull()) {
    const defaultLimit = options.miner.defaultTransactionGasLimit;
    if (defaultLimit === Quantity.Empty) {
      // if the default limit is `Quantity.Empty` use a gas estimate
      tx.gas = await eth_estimateGas(transaction, Tag.latest);
    } else {
      tx.gas = defaultLimit;
    }
  }
  if ("gasPrice" in tx && tx.gasPrice.isNull()) {
    tx.gasPrice = options.miner.defaultGasPrice;
  }

  if ("maxFeePerGas" in tx && tx.maxFeePerGas.isNull()) {
    const block = blockchain.blocks.latest;
    tx.maxFeePerGas = Quantity.from(
      Block.calcNBlocksMaxBaseFee(3, <BaseFeeHeader>block.header)
    );
  }

  if ("maxPriorityFeePerGas" in tx && tx.maxPriorityFeePerGas.isNull()) {
    tx.maxPriorityFeePerGas = await eth_maxPriorityFeePerGas();
  }
}

function createSimulatedTransaction(
  blockchain: Blockchain,
  options: EthereumInternalOptions,
  common: Common,
  transaction: any,
  simulationBlock: Block
): SimulationTransaction {
  const simulationBlockHeader = simulationBlock.header;

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
    if (typeof transaction.input !== "undefined") {
      data = Data.from(transaction.input);
    }
  } else {
    data = Data.from(transaction.data);
  }

  // eth_call doesn't validate that the transaction has a sufficient
  // "effectiveGasPrice". however, if `maxPriorityFeePerGas` or
  // `maxFeePerGas` values are set, the baseFeePerGas is used to calculate
  // the effectiveGasPrice, which is used to calculate tx costs/refunds.
  const baseFeePerGasBigInt = simulationBlockHeader.baseFeePerGas
    ? simulationBlockHeader.baseFeePerGas.toBigInt()
    : undefined;

  let gasPrice: Quantity;
  const hasGasPrice = typeof transaction.gasPrice !== "undefined";
  // if the original block didn't have a `baseFeePerGas` (baseFeePerGasBigInt
  // is undefined) then EIP-1559 was not active on that block and we can't use
  // type 2 fee values (as they rely on the baseFee)
  if (!common.isActivatedEIP(1559) || baseFeePerGasBigInt === undefined) {
    gasPrice = Quantity.from(hasGasPrice ? 0 : transaction.gasPrice);
  } else {
    const hasMaxFeePerGas = typeof transaction.maxFeePerGas !== "undefined";
    const hasMaxPriorityFeePerGas =
      typeof transaction.maxPriorityFeePerGas !== "undefined";

    if (hasGasPrice && (hasMaxFeePerGas || hasMaxPriorityFeePerGas)) {
      throw new Error(
        "both gasPrice and (maxFeePerGas or maxPriorityFeePerGas) specified"
      );
    }
    // User specified 1559 gas fields (or none), use those
    let maxFeePerGas = 0n;
    let maxPriorityFeePerGas = 0n;
    if (hasMaxFeePerGas) {
      maxFeePerGas = BigInt(transaction.maxFeePerGas);
    }
    if (hasMaxPriorityFeePerGas) {
      maxPriorityFeePerGas = BigInt(transaction.maxPriorityFeePerGas);
    }
    if (maxPriorityFeePerGas > 0 || maxFeePerGas > 0) {
      const a = maxFeePerGas - baseFeePerGasBigInt;
      const tip = a < maxPriorityFeePerGas ? a : maxPriorityFeePerGas;
      gasPrice = Quantity.from(baseFeePerGasBigInt + tip);
    } else {
      gasPrice = Quantity.from(0);
    }
  }

  // if EIP 2930 is activated and they provided an invalid access list,
  // clear it out
  if (
    common.isActivatedEIP(2930) &&
    transaction.accessList &&
    !AccessLists.isValidAccessList(transaction.accessList)
  ) {
    transaction.accessList = [];
  }

  const block = new RuntimeBlock(
    simulationBlockHeader.number,
    simulationBlockHeader.parentHash,
    blockchain.coinbase,
    gas.toBuffer(),
    simulationBlockHeader.gasUsed.toBuffer(),
    simulationBlockHeader.timestamp,
    options.miner.difficulty,
    simulationBlockHeader.totalDifficulty,
    baseFeePerGasBigInt
  );

  return {
    gas,
    // if we don't have a from address, our caller sut be the configured coinbase address
    from:
      transaction.from == null
        ? blockchain.coinbase
        : Address.from(transaction.from),
    to: transaction.to == null ? null : Address.from(transaction.to),
    gasPrice,
    value: transaction.value == null ? null : Quantity.from(transaction.value),
    data,
    block
  };
}
const version = process.env.VERSION || "DEV";
//#endregion

//#region Constants
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
//#endregion

//#region helpers
/**
 * Combines RuntimeErrors for a list of rejected or reverted transactions.
 * @param transactions Array of transactions with errors to assert.
 */
function assertExceptionalTransactions(transactions: TypedTransaction[]) {
  let baseError: string = null;
  let errors: string[];
  const data = {};

  transactions.forEach(transaction => {
    if (transaction.execException) {
      if (baseError) {
        baseError = VM_EXCEPTIONS;
        errors.push(
          `${transaction.hash.toString()}: ${transaction.execException}\n`
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

//#endregion helpers

export default class EthereumApi implements Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  readonly #getId = (
    id => () =>
      Quantity.from(++id)
  )(0);
  readonly #filters = new Map<string, InternalFilter>();
  readonly #subscriptions = new Map<string, Emittery.UnsubscribeFn>();
  readonly #options: EthereumInternalOptions;
  readonly #blockchain: Blockchain;
  readonly #wallet: Wallet;

  /**
   * This is the Ethereum API that the provider interacts with.
   * The only methods permitted on the prototype are the supported json-rpc
   * methods.
   * @param options -
   * @param wallet -
   * @param emitter -
   */
  constructor(
    options: EthereumInternalOptions,
    wallet: Wallet,
    blockchain: Blockchain
  ) {
    this.#options = options;
    this.#wallet = wallet;
    this.#blockchain = blockchain;
  }

  //#region db
  /**
   * Stores a string in the local database.
   *
   * @param dbName - Database name.
   * @param key - Key name.
   * @param value - String to store.
   * @returns returns true if the value was stored, otherwise false.
   * @example
   * ```javascript
   * console.log(await provider.send("db_putString", ["testDb", "testKey", "testValue"] ));
   * ```
   */
  @assertArgLength(3)
  async db_putString(
    dbName: string,
    key: string,
    value: string
  ): Promise<boolean> {
    return false;
  }

  /**
   * Returns string from the local database.
   *
   * @param dbName - Database name.
   * @param key - Key name.
   * @returns The previously stored string.
   * @example
   * ```javascript
   * console.log(await provider.send("db_getString", ["testDb", "testKey"] ));
   * ```
   */
  @assertArgLength(2)
  async db_getString(dbName: string, key: string) {
    return "";
  }

  /**
   * Stores binary data in the local database.
   *
   * @param dbName - Database name.
   * @param key - Key name.
   * @param data - Data to store.
   * @returns true if the value was stored, otherwise false.
   * @example
   * ```javascript
   * console.log(await provider.send("db_putHex", ["testDb", "testKey", "0x0"] ));
   * ```
   */
  @assertArgLength(3)
  async db_putHex(dbName: string, key: string, data: DATA) {
    return false;
  }

  /**
   * Returns binary data from the local database.
   *
   * @param dbName - Database name.
   * @param key - Key name.
   * @returns The previously stored data.
   * @example
   * ```javascript
   * console.log(await provider.send("db_getHex", ["testDb", "testKey"] ));
   * ```
   */
  @assertArgLength(2)
  async db_getHex(dbName: string, key: string) {
    return "0x00";
  }
  //#endregion

  //#region bzz
  /**
   * Returns the kademlia table in a readable table format.
   * @returns Returns the kademlia table in a readable table format.
   * @example
   * ```javascript
   * console.log(await provider.send("bzz_hive"));
   * ```
   */
  @assertArgLength(0)
  async bzz_hive() {
    return [];
  }

  /**
   * Returns details about the swarm node.
   * @returns Returns details about the swarm node.
   * @example
   * ```javascript
   * console.log(await provider.send("bzz_info"));
   * ```
   */
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
   * @param timestamp - the timestamp the block should be mined with.
   * EXPERIMENTAL: Optionally, specify an `options` object with `timestamp`
   * and/or `blocks` fields. If `blocks` is given, it will mine exactly `blocks`
   *  number of blocks, regardless of any other blocks mined or reverted during it's
   * operation. This behavior is subject to change!
   *
   * @returns The string `"0x0"`. May return additional meta-data in the future.
   *
   * @example
   * ```javascript
   * console.log("start", await provider.send("eth_blockNumber"));
   * await provider.send("evm_mine", [{blocks: 5}] ); // mines 5 blocks
   * console.log("end", await provider.send("eth_blockNumber"));
   * ```
   */
  async evm_mine(): Promise<"0x0">;
  async evm_mine(timestamp: number): Promise<"0x0">;
  async evm_mine(options: Ethereum.MineOptions): Promise<"0x0">;
  @assertArgLength(0, 1)
  async evm_mine(arg?: number | Ethereum.MineOptions): Promise<"0x0"> {
    const blockchain = this.#blockchain;
    const options = this.#options;
    const vmErrorsOnRPCResponse = options.chain.vmErrorsOnRPCResponse;
    // Since `typeof null === "object"` we have to guard against that
    if (arg !== null && typeof arg === "object") {
      let { blocks, timestamp } = arg;
      if (blocks == null) {
        blocks = 1;
      }
      // TODO(perf): add an option to mine a bunch of blocks in a batch so
      // we can save them all to the database in one go.
      // Developers like to move the blockchain forward by thousands of blocks
      // at a time and doing this would make it way faster
      for (let i = 0; i < blocks; i++) {
        const { transactions } = await blockchain.mine(
          Capacity.FillBlock,
          timestamp,
          true
        );

        if (vmErrorsOnRPCResponse) {
          assertExceptionalTransactions(transactions);
        }
      }
    } else {
      const { transactions } = await blockchain.mine(
        Capacity.FillBlock,
        arg as number | null,
        true
      );
      if (vmErrorsOnRPCResponse) {
        assertExceptionalTransactions(transactions);
      }
    }

    return "0x0";
  }

  /**
   * Sets the given account's nonce to the specified value. Mines a new block
   * before returning.
   *
   * Warning: this will result in an invalid state tree.
   *
   * @param address - The account address to update.
   * @param nonce - The nonce value to be set.
   * @returns `true` if it worked, otherwise `false`.
   * @example
   * ```javascript
   * const nonce = "0x3e8";
   * const [address] = await provider.request({ method: "eth_accounts", params: [] });
   * const result = await provider.send("evm_setAccountNonce", [address, nonce] );
   * console.log(result);
   * ```
   */
  @assertArgLength(2)
  async evm_setAccountNonce(address: DATA, nonce: QUANTITY) {
    // TODO: the effect of this function could happen during a block mine operation, which would cause all sorts of
    // issues. We need to figure out a good way of timing this.
    const buffer = Address.from(address).toBuffer();
    const blockchain = this.#blockchain;
    const stateManager = blockchain.vm.stateManager;
    const account = await stateManager.getAccount({ buf: buffer } as any);

    account.nonce = {
      toArrayLike: () => Quantity.toBuffer(nonce)
    } as any;

    await stateManager.putAccount({ buf: buffer } as any, account);

    // TODO: do we need to mine a block here? The changes we're making really don't make any sense at all
    // and produce an invalid trie going forward.
    await blockchain.mine(Capacity.Empty);
    return true;
  }

  /**
   * Sets the given account's balance to the specified WEI value. Mines a new block
   * before returning.
   *
   * Warning: this will result in an invalid state tree.
   *
   * @param address - The account address to update.
   * @param balance - The balance value, in WEI, to be set.
   * @returns `true` if it worked, otherwise `false`.
   * @example
   * ```javascript
   * const balance = "0x3e8";
   * const [address] = await provider.request({ method: "eth_accounts", params: [] });
   * const result = await provider.send("evm_setAccountBalance", [address, balance] );
   * console.log(result);
   * ```
   */
  @assertArgLength(2)
  async evm_setAccountBalance(address: DATA, balance: QUANTITY) {
    // TODO: the effect of this function could happen during a block mine operation, which would cause all sorts of
    // issues. We need to figure out a good way of timing this.
    const buffer = Address.from(address).toBuffer();
    const blockchain = this.#blockchain;
    const stateManager = blockchain.vm.stateManager;
    const account = await stateManager.getAccount({ buf: buffer } as any);

    account.balance = {
      toArrayLike: () => Quantity.toBuffer(balance)
    } as any;

    await stateManager.putAccount({ buf: buffer } as any, account);

    // TODO: do we need to mine a block here? The changes we're making really don't make any sense at all
    // and produce an invalid trie going forward.
    await blockchain.mine(Capacity.Empty);
    return true;
  }

  /**
   * Sets the given account's code to the specified data. Mines a new block
   * before returning.
   *
   * Warning: this will result in an invalid state tree.
   *
   * @param address - The account address to update.
   * @param code - The code to be set.
   * @returns `true` if it worked, otherwise `false`.
   * @example
   * ```javascript
   * const data = "0xbaddad42";
   * const [address] = await provider.request({ method: "eth_accounts", params: [] });
   * const result = await provider.send("evm_setAccountCode", [address, data] );
   * console.log(result);
   * ```
   */
  @assertArgLength(2)
  async evm_setAccountCode(address: DATA, code: DATA) {
    // TODO: the effect of this function could happen during a block mine operation, which would cause all sorts of
    // issues. We need to figure out a good way of timing this.
    const addressBuffer = Address.from(address).toBuffer();
    const codeBuffer = Data.toBuffer(code);
    const blockchain = this.#blockchain;
    const stateManager = blockchain.vm.stateManager;
    // The ethereumjs-vm StateManager does not allow to set empty code,
    // therefore we will manually set the code hash when "clearing" the contract code
    if (codeBuffer.length > 0) {
      await stateManager.putContractCode(
        { buf: addressBuffer } as any,
        codeBuffer
      );
    } else {
      const account = await stateManager.getAccount({
        buf: addressBuffer
      } as any);
      account.codeHash = KECCAK256_NULL;
      await stateManager.putAccount({ buf: addressBuffer } as any, account);
    }

    // TODO: do we need to mine a block here? The changes we're making really don't make any sense at all
    // and produce an invalid trie going forward.
    await blockchain.mine(Capacity.Empty);
    return true;
  }

  /**
   * Sets the given account's storage slot to the specified data. Mines a new block
   * before returning.
   *
   * Warning: this will result in an invalid state tree.
   *
   * @param address - The account address to update.
   * @param slot - The storage slot that should be set.
   * @param value - The value to be set.
   * @returns `true` if it worked, otherwise `false`.
   * @example
   * ```javascript
   * const slot = "0x0000000000000000000000000000000000000000000000000000000000000005";
   * const data = "0xbaddad42";
   * const [address] = await provider.request({ method: "eth_accounts", params: [] });
   * const result = await provider.send("evm_setAccountStorageAt", [address, slot, data] );
   * console.log(result);
   * ```
   */
  @assertArgLength(3)
  async evm_setAccountStorageAt(address: DATA, slot: DATA, value: DATA) {
    // TODO: the effect of this function could happen during a block mine operation, which would cause all sorts of
    // issues. We need to figure out a good way of timing this.
    const addressBuffer = Address.from(address).toBuffer();
    const slotBuffer = Data.toBuffer(slot);
    const valueBuffer = Data.toBuffer(value);
    const blockchain = this.#blockchain;
    const stateManager = blockchain.vm.stateManager;
    await stateManager.putContractStorage(
      { buf: addressBuffer } as any,
      slotBuffer,
      valueBuffer
    );

    // TODO: do we need to mine a block here? The changes we're making really don't make any sense at all
    // and produce an invalid trie going forward.
    await blockchain.mine(Capacity.Empty);
    return true;
  }

  /**
   * Jump forward in time by the given amount of time, in seconds.
   * @param seconds - Number of seconds to jump forward in time by. Must be greater than or equal to `0`.
   * @returns Returns the total time adjustment, in seconds.
   * @example
   * ```javascript
   * const seconds = 10;
   * const timeAdjustment = await provider.send("evm_increaseTime", [seconds] );
   * console.log(timeAdjustment);
   * ```
   */
  @assertArgLength(1)
  async evm_increaseTime(seconds: number | QUANTITY) {
    const milliseconds =
      (typeof seconds === "number" ? seconds : Quantity.toNumber(seconds)) *
      1000;
    return Math.floor(this.#blockchain.increaseTime(milliseconds) / 1000);
  }

  /**
   * Sets the internal clock time to the given timestamp.
   *
   * Warning: This will allow you to move *backwards* in time, which may cause
   * new blocks to appear to be mined before old blocks. This will result in
   * an invalid state.
   *
   * @param time - JavaScript timestamp (millisecond precision).
   * @returns The amount of *seconds* between the given timestamp and now.
   * @example
   * ```javascript
   * const currentDate = Date.now();
   * setTimeout(async () => {
   *   const time = await provider.send("evm_setTime", [currentDate] );
   *   console.log(time); // should be about two seconds ago
   * }, 1000);
   * ```
   */
  @assertArgLength(0, 1)
  async evm_setTime(time: number | QUANTITY | Date) {
    let timestamp: number;
    switch (typeof time) {
      case "object":
        timestamp = time.getTime();
        break;
      case "number":
        timestamp = time;
        break;
      default:
        timestamp = Quantity.toNumber(time);
        break;
    }
    const blockchain = this.#blockchain;
    const offsetMilliseconds = blockchain.setTimeDiff(timestamp);
    // convert offsetMilliseconds to seconds:
    return Math.floor(offsetMilliseconds / 1000);
  }

  /**
   * Revert the state of the blockchain to a previous snapshot. Takes a single
   * parameter, which is the snapshot id to revert to. This deletes the given
   * snapshot, as well as any snapshots taken after (e.g.: reverting to id 0x1
   * will delete snapshots with ids 0x1, 0x2, etc.)
   *
   * @param snapshotId - The snapshot id to revert.
   * @returns `true` if a snapshot was reverted, otherwise `false`.
   *
   * @example
   * ```javascript
   * const [from, to] = await provider.send("eth_accounts");
   * const startingBalance = BigInt(await provider.send("eth_getBalance", [from] ));
   *
   * // take a snapshot
   * const snapshotId = await provider.send("evm_snapshot");
   *
   * // send value to another account (over-simplified example)
   * await provider.send("eth_subscribe", ["newHeads"] );
   * await provider.send("eth_sendTransaction", [{from, to, value: "0xffff"}] );
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   *
   * // ensure balance has updated
   * const newBalance = await provider.send("eth_getBalance", [from] );
   * assert(BigInt(newBalance) < startingBalance);
   *
   * // revert the snapshot
   * const isReverted = await provider.send("evm_revert", [snapshotId] );
   * assert(isReverted);
   * console.log({isReverted: isReverted});
   *
   * // ensure balance has reverted
   * const endingBalance = await provider.send("eth_getBalance", [from] );
   * const isBalanceReverted = assert.strictEqual(BigInt(endingBalance), startingBalance);
   * console.log({isBalanceReverted: isBalanceReverted});
   * ```
   */
  @assertArgLength(1)
  async evm_revert(snapshotId: QUANTITY) {
    return this.#blockchain.revert(Quantity.from(snapshotId));
  }

  /**
   * Snapshot the state of the blockchain at the current block. Takes no
   * parameters. Returns the id of the snapshot that was created. A snapshot can
   * only be reverted once. After a successful `evm_revert`, the same snapshot
   * id cannot be used again. Consider creating a new snapshot after each
   * `evm_revert` if you need to revert to the same point multiple times.
   *
   * @returns The hex-encoded identifier for this snapshot.
   *
   * @example
   * ```javascript
   * const provider = ganache.provider();
   * const [from, to] = await provider.send("eth_accounts");
   * const startingBalance = BigInt(await provider.send("eth_getBalance", [from] ));
   *
   * // take a snapshot
   * const snapshotId = await provider.send("evm_snapshot");
   *
   * // send value to another account (over-simplified example)
   * await provider.send("eth_subscribe", ["newHeads"] );
   * await provider.send("eth_sendTransaction", [{from, to, value: "0xffff"}] );
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   *
   * // ensure balance has updated
   * const newBalance = await provider.send("eth_getBalance", [from] );
   * assert(BigInt(newBalance) < startingBalance);
   *
   * // revert the snapshot
   * const isReverted = await provider.send("evm_revert", [snapshotId] );
   * assert(isReverted);
   *
   * // ensure balance has reverted
   * const endingBalance = await provider.send("eth_getBalance", [from] );
   * const isBalanceReverted = assert.strictEqual(BigInt(endingBalance), startingBalance);
   * console.log({isBalanceReverted: isBalanceReverted});
   * ```
   */
  async evm_snapshot() {
    return Quantity.from(this.#blockchain.snapshot());
  }

  /**
   * Adds any arbitrary account to the `personal` namespace.
   *
   * Note: accounts already known to the `personal` namespace and accounts
   * returned by `eth_accounts` cannot be re-added using this method.
   * @param address - The address of the account to add to the `personal`
   * namespace.
   * @param passphrase - The passphrase used to encrypt the account's private key.
   * NOTE: this passphrase will be needed for all `personal` namespace calls
   * that require a password.
   * @returns `true` if  the account was successfully added. `false` if the
   * account is already in the `personal` namespace.
   * @example
   * ```javascript
   * const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
   * const passphrase = "passphrase"
   * const result = await provider.send("evm_addAccount", [address, passphrase] );
   * console.log(result);
   * ```
   */
  async evm_addAccount(address: DATA, passphrase: string) {
    const addy = new Address(address);
    return this.#wallet.addUnknownAccount(addy, passphrase);
  }

  /**
   * Removes an account from the `personal` namespace.
   *
   * Note: accounts not known to the `personal` namespace cannot be removed
   * using this method.
   * @param address - The address of the account to remove from the `personal`
   * namespace.
   * @param passphrase - The passphrase used to decrypt the account's private key.
   * @returns `true` if the account was successfully removed. `false` if the
   * account was not in the `personal` namespace.
   * @example
   * ```javascript
   * const [address] = await provider.request({ method: "eth_accounts", params: [] });
   * const passphrase = "passphrase"
   * const result = await provider.send("evm_removeAccount", [address, passphrase] );
   * console.log(result);
   * ```
   */
  async evm_removeAccount(address: DATA, passphrase: string) {
    const addy = new Address(address);
    return this.#wallet.removeKnownAccount(addy, passphrase);
  }

  //#endregion evm

  //#region miner
  /**
   * Resume the CPU mining process with the given number of threads.
   *
   * Note: `threads` is ignored.
   * @param threads - Number of threads to resume the CPU mining process with.
   * @returns `true`.
   * @example
   * ```javascript
   * await provider.send("miner_stop");
   * // check that eth_mining returns false
   * console.log(await provider.send("eth_mining"));
   * await provider.send("miner_start");
   * // check that eth_mining returns true
   * console.log(await provider.send("eth_mining"));
   * ```
   */
  @assertArgLength(0, 1)
  async miner_start(threads: number = 1) {
    if (this.#options.miner.instamine === "eager") {
      const resumption = await this.#blockchain.resume(threads);
      // resumption can be undefined if the blockchain isn't currently paused
      if (
        resumption &&
        resumption.transactions != null &&
        this.#options.chain.vmErrorsOnRPCResponse
      ) {
        assertExceptionalTransactions(resumption.transactions);
      }
    } else {
      this.#blockchain.resume(threads);
    }
    return true;
  }

  /**
   * Stop the CPU mining operation.
   * @returns `true`.
   * @example
   * ```javascript
   * // check that eth_mining returns true
   * console.log(await provider.send("eth_mining"));
   * await provider.send("miner_stop");
   * // check that eth_mining returns false
   * console.log(await provider.send("eth_mining"));
   * ```
   */
  @assertArgLength(0)
  async miner_stop() {
    this.#blockchain.pause();
    return true;
  }

  /**
   * Sets the default accepted gas price when mining transactions.
   * Any transactions that don't specify a gas price will use this amount.
   * Transactions that are below this limit are excluded from the mining process.
   * @param number - Default accepted gas price.
   * @returns `true`.
   * @example
   * ```javascript
   * console.log(await provider.send("miner_setGasPrice", [300000] ));
   * ```
   */
  @assertArgLength(1)
  async miner_setGasPrice(number: QUANTITY) {
    this.#options.miner.defaultGasPrice = Quantity.from(number);
    return true;
  }

  /**
   * Sets the etherbase, where mining rewards will go.
   * @param address - The address where the mining rewards will go.
   * @returns `true`.
   * @example
   * ```javascript
   * const [account] = await provider.request({ method: "eth_accounts", params: [] });
   * console.log(await provider.send("miner_setEtherbase", [account] ));
   * ```
   */
  @assertArgLength(1)
  async miner_setEtherbase(address: DATA) {
    this.#blockchain.coinbase = Address.from(address);
    return true;
  }

  /**
   * Set the extraData block header field a miner can include.
   * @param extra - The `extraData` to include.
   * @returns If successfully set returns `true`, otherwise returns an error.
   * @example
   * ```javascript
   * console.log(await provider.send("miner_setExtra", ["0x0"] ));
   * ```
   */
  @assertArgLength(1)
  async miner_setExtra(extra: DATA) {
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
   * @example
   * ```javascript
   * console.log(await provider.send("web3_clientVersion"));
   * ```
   */
  @assertArgLength(0)
  async web3_clientVersion() {
    return CLIENT_VERSION;
  }

  /**
   * Returns Keccak-256 (not the standardized SHA3-256) of the given data.
   * @param data - the data to convert into a SHA3 hash.
   * @returns The SHA3 result of the given string.
   * @example
   * ```javascript
   * const data = "hello trufflers";
   * const sha3 = await provider.send("web3_sha3", [data] );
   * console.log(sha3);
   * ```
   */
  @assertArgLength(1)
  async web3_sha3(data: DATA) {
    return Data.from(keccak(Data.toBuffer(data)));
  }
  //#endregion

  //#region net
  /**
   * Returns the current network id.
   * @returns The current network id. This value should NOT be JSON-RPC
   * Quantity/Data encoded.
   * @example
   * ```javascript
   * console.log(await provider.send("net_version"));
   * ```
   */
  @assertArgLength(0)
  async net_version() {
    return this.#options.chain.networkId.toString();
  }

  /**
   * Returns `true` if client is actively listening for network connections.
   * @returns `true` when listening, otherwise `false`.
   * @example
   * ```javascript
   * console.log(await provider.send("net_listening"));
   * ```
   */
  @assertArgLength(0)
  async net_listening() {
    return true;
  }

  /**
   * Returns number of peers currently connected to the client.
   * @returns Number of connected peers.
   * @example
   * ```javascript
   * console.log(await provider.send("net_peerCount"));
   * ```
   */
  @assertArgLength(0)
  async net_peerCount() {
    return Quantity.Zero;
  }
  //#endregion

  //#region eth

  // TODO: example doesn't return correct value
  /**
   * Generates and returns an estimate of how much gas is necessary to allow the
   * transaction to complete. The transaction will not be added to the
   * blockchain. Note that the estimate may be significantly more than the
   * amount of gas actually used by the transaction, for a variety of reasons
   * including EVM mechanics and node performance.
   *
   * Transaction call object:
   * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
   * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
   * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
   * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
   * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
   * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
   *
   * @param transaction - The transaction call object as seen in source.
   * @param blockNumber - Integer block number, or the string "latest", "earliest"
   *  or "pending".
   *
   * @returns The amount of gas used.
   *
   * @example
   * ```javascript
   * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
   * const gasEstimate = await provider.request({ method: "eth_estimateGas", params: [{ from, to }, "latest" ] });
   * console.log(gasEstimate);
   * ```
   */
  @assertArgLength(1, 2)
  async eth_estimateGas(
    transaction: Ethereum.Transaction,
    blockNumber: QUANTITY | Ethereum.Tag = Tag.latest
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
      const tx = TransactionFactory.fromRpc(
        transaction as Transaction,
        blockchain.common
      );
      if (tx.from == null) {
        tx.from = coinbase;
      }
      if (tx.gas.isNull()) {
        // eth_estimateGas isn't subject to regular transaction gas limits
        tx.gas = options.miner.callGasLimit;
      }

      const block = new RuntimeBlock(
        Quantity.from((parentHeader.number.toBigInt() || 0n) + 1n),
        parentHeader.parentHash,
        parentHeader.miner,
        tx.gas.toBuffer(),
        parentHeader.gasUsed.toBuffer(),
        parentHeader.timestamp,
        options.miner.difficulty,
        parentHeader.totalDifficulty,
        0n // no baseFeePerGas for estimates
      );
      const runArgs = {
        tx: tx.toVmTransaction(),
        block,
        skipBalance: true,
        skipNonce: true
      };
      estimateGas(generateVM, runArgs, (err: Error, result: any) => {
        if (err) return reject(err);
        resolve(Quantity.from(result.gasEstimate.toArrayLike(Buffer)));
      });
    });
  }

  /**
   * Returns the current ethereum protocol version.
   * @returns The current ethereum protocol version.
   * @example
   * ```javascript
   * const version = await provider.request({ method: "eth_protocolVersion", params: [] });
   * console.log(version);
   * ```
   */
  @assertArgLength(0)
  async eth_protocolVersion() {
    return PROTOCOL_VERSION;
  }

  /**
   * Returns an object containing data about the sync status or `false` when not syncing.
   *
   * @returns An object with sync status data or `false`, when not syncing.
   *
   * * `startingBlock`: \{bigint\} The block at which the import started (will
   *     only be reset, after the sync reached his head).
   * * `currentBlock`: \{bigint\} The current block, same as `eth_blockNumber`.
   * * `highestBlock`: \{bigint\} The estimated highest block.
   *
   * @example
   * ```javascript
   * const result = await provider.request({ method: "eth_syncing", params: [] });
   * console.log(result);
   * ```
   */
  @assertArgLength(0)
  async eth_syncing() {
    return false;
  }

  /**
   * Returns the client coinbase address.
   * @returns The current coinbase address.
   * @example
   * ```javascript
   * const coinbaseAddress = await provider.request({ method: "eth_coinbase" });
   * console.log(coinbaseAddress);
   * ```
   */
  @assertArgLength(0)
  async eth_coinbase() {
    return this.#blockchain.coinbase;
  }

  /**
   * Returns information about a block by block number.
   * @param number - Integer of a block number, or the string "earliest", "latest" or "pending", as in the
   * default block parameter.
   * @param transactions - If `true` it returns the full transaction objects, if `false` only the hashes of the
   * transactions.
   * @returns The block, `null` if the block doesn't exist.
   *
   * * `hash`: `DATA`, 32 Bytes - Hash of the block. `null` when pending.
   * * `parentHash`: `DATA`, 32 Bytes - Hash of the parent block.
   * * `sha3Uncles`: `DATA`, 32 Bytes - SHA3 of the uncles data in the block.
   * * `miner`: `DATA`, 20 Bytes -  Address of the miner.
   * * `stateRoot`: `DATA`, 32 Bytes - The root of the state trie of the block.
   * * `transactionsRoot`: `DATA`, 32 Bytes - The root of the transaction trie of the block.
   * * `receiptsRoot`: `DATA`, 32 Bytes - The root of the receipts trie of the block.
   * * `logsBloom`: `DATA`, 256 Bytes - The bloom filter for the logs of the block. `null` when pending.
   * * `difficulty`: `QUANTITY` - Integer of the difficulty of this block.
   * * `number`: `QUANTITY` - The block number. `null` when pending.
   * * `gasLimit`: `QUANTITY` - The maximum gas allowed in the block.
   * * `gasUsed`: `QUANTITY` - Total gas used by all transactions in the block.
   * * `timestamp`: `QUANTITY` - The unix timestamp for when the block was collated.
   * * `extraData`: `DATA` - Extra data for the block.
   * * `mixHash`: `DATA`, 256 Bytes - Hash identifier for the block.
   * * `nonce`: `DATA`, 8 Bytes - Hash of the generated proof-of-work. `null` when pending.
   * * `totalDifficulty`: `QUANTITY` - Integer of the total difficulty of the chain until this block.
   * * `size`: `QUANTITY` - Integer the size of the block in bytes.
   * * `transactions`: `Array` - Array of transaction objects or 32 Bytes transaction hashes depending on the last parameter.
   * * `uncles`: `Array` - Array of uncle hashes.
   *
   * @example
   * ```javascript
   * const block = await provider.request({ method: "eth_getBlockByNumber", params: ["0x0", false] });
   * console.log(block);
   * ```
   */
  @assertArgLength(1, 2)
  async eth_getBlockByNumber<IncludeTransactions extends boolean = false>(
    number: QUANTITY | Ethereum.Tag,
    transactions?: IncludeTransactions
  ): Promise<Ethereum.Block<IncludeTransactions, "private"> | null> {
    if (typeof transactions === "undefined") {
      transactions = false as IncludeTransactions;
    }
    const block = await this.#blockchain.blocks
      .get(number)
      .catch<Block>(_ => null);
    // @ts-ignore
    return block ? block.toJSON<IncludeTransactions>(transactions) : null;
  }

  /**
   * Returns information about a block by block hash.
   * @param hash - Hash of a block.
   * @param transactions - If `true` it returns the full transaction objects, if `false` only the hashes of the
   * transactions.
   * @returns The block, `null` if the block doesn't exist.
   *
   * * `hash`: `DATA`, 32 Bytes - Hash of the block. `null` when pending.
   * * `parentHash`: `DATA`, 32 Bytes - Hash of the parent block.
   * * `sha3Uncles`: `DATA`, 32 Bytes - SHA3 of the uncles data in the block.
   * * `miner`: `DATA`, 20 Bytes -  Address of the miner.
   * * `stateRoot`: `DATA`, 32 Bytes - The root of the state trie of the block.
   * * `transactionsRoot`: `DATA`, 32 Bytes - The root of the transaction trie of the block.
   * * `receiptsRoot`: `DATA`, 32 Bytes - The root of the receipts trie of the block.
   * * `logsBloom`: `DATA`, 256 Bytes - The bloom filter for the logs of the block. `null` when pending.
   * * `difficulty`: `QUANTITY` - Integer of the difficulty of this block.
   * * `number`: `QUANTITY` - The block number. `null` when pending.
   * * `gasLimit`: `QUANTITY` - The maximum gas allowed in the block.
   * * `gasUsed`: `QUANTITY` - Total gas used by all transactions in the block.
   * * `timestamp`: `QUANTITY` - The unix timestamp for when the block was collated.
   * * `extraData`: `DATA` - Extra data for the block.
   * * `mixHash`: `DATA`, 256 Bytes - Hash identifier for the block.
   * * `nonce`: `DATA`, 8 Bytes - Hash of the generated proof-of-work. `null` when pending.
   * * `totalDifficulty`: `QUANTITY` - Integer of the total difficulty of the chain until this block.
   * * `size`: `QUANTITY` - Integer the size of the block in bytes.
   * * `transactions`: `Array` - Array of transaction objects or 32 Bytes transaction hashes depending on the last parameter.
   * * `uncles`: `Array` - Array of uncle hashes.
   *
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
   * const txReceipt = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
   * const block = await provider.request({ method: "eth_getBlockByHash", params: [txReceipt.blockHash, true] });
   * console.log(block);
   * ```
   */
  @assertArgLength(1, 2)
  async eth_getBlockByHash<IncludeTransactions extends boolean = false>(
    hash: DATA,
    transactions?: IncludeTransactions
  ): Promise<Ethereum.Block<IncludeTransactions, "private"> | null> {
    if (typeof transactions === "undefined") {
      transactions = false as IncludeTransactions;
    }
    const block = await this.#blockchain.blocks
      .getByHash(hash)
      .catch<Block>(_ => null);
    return block ? block.toJSON<IncludeTransactions>(transactions) : null;
  }

  /**
   * Returns the number of transactions in a block from a block matching the given block number.
   * @param number - Integer of a block number, or the string "earliest", "latest" or "pending", as in the
   * default block parameter.
   * @returns Integer of the number of transactions in the block.
   * @example
   * ```javascript
   * const txCount = await provider.request({ method: "eth_getBlockTransactionCountByNumber", params: ["0x0"] });
   * console.log(txCount);
   * ```
   */
  @assertArgLength(1)
  async eth_getBlockTransactionCountByNumber(
    blockNumber: QUANTITY | Ethereum.Tag
  ) {
    const { blocks } = this.#blockchain;
    const blockNum = blocks.getEffectiveNumber(blockNumber);
    const rawBlock = await blocks.getRawByBlockNumber(blockNum);
    if (!rawBlock) return null;

    const [, rawTransactions] = decode<GanacheRawBlock>(rawBlock);
    return Quantity.from(rawTransactions.length);
  }

  /**
   * Returns the number of transactions in a block from a block matching the given block hash.
   * @param hash - Hash of a block.
   * @returns Number of transactions in the block.
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
   * const txReceipt = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
   * const txCount = await provider.request({ method: "eth_getBlockTransactionCountByHash", params: [txReceipt.blockHash] });
   * console.log(txCount);
   * ```
   */
  @assertArgLength(1)
  async eth_getBlockTransactionCountByHash(hash: DATA) {
    const { blocks } = this.#blockchain;
    const blockNum = await blocks.getNumberFromHash(hash);
    if (!blockNum) return null;

    const rawBlock = await blocks.getRawByBlockNumber(Quantity.from(blockNum));
    if (!rawBlock) return null;

    const [, rawTransactions] = decode<GanacheRawBlock>(rawBlock);
    return Quantity.from(rawTransactions.length);
  }

  /**
   * Returns a list of available compilers.
   * @returns List of available compilers.
   * @example
   * ```javascript
   * const compilers = await provider.send("eth_getCompilers");
   * console.log(compilers);
   * ```
   */
  @assertArgLength(0)
  async eth_getCompilers() {
    return [] as string[];
  }

  /**
   * Returns information about a transaction by block hash and transaction index position.
   * @param hash - Hash of a block.
   * @param index - Integer of the transaction index position.
   * @returns The transaction object or `null` if no transaction was found.
   *
   * * `hash`: `DATA`, 32 Bytes - The transaction hash.
   * * `nonce`: `QUANTITY` - The number of transactions made by the sender prior to this one.
   * * `blockHash`: `DATA`, 32 Bytes - The hash of the block the transaction is in. `null` when pending.
   * * `blockNumber`: `QUANTITY` - The number of the block the transaction is in. `null` when pending.
   * * `transactionIndex`: `QUANTITY` - The index position of the transaction in the block.
   * * `from`: `DATA`, 20 Bytes - The address the transaction is sent from.
   * * `to`: `DATA`, 20 Bytes - The address the transaction is sent to.
   * * `value`: `QUANTITY` - The value transferred in wei.
   * * `gas`: `QUANTITY` - The gas provided by the sender.
   * * `gasPrice`: `QUANTITY` - The price of gas in wei.
   * * `input`: `DATA` - The data sent along with the transaction.
   * * `v`: `QUANTITY` - ECDSA recovery id.
   * * `r`: `DATA`, 32 Bytes - ECDSA signature r.
   * * `s`: `DATA`, 32 Bytes - ECDSA signature s.
   *
   * @example
   * ```javascript
   * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
   * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
   * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   * const { blockHash, transactionIndex } = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
   *
   * const tx = await provider.request({ method: "eth_getTransactionByBlockHashAndIndex", params: [ blockHash, transactionIndex ] });
   * console.log(tx);
   * ```
   */
  @assertArgLength(2)
  async eth_getTransactionByBlockHashAndIndex(
    hash: DATA,
    index: QUANTITY
  ): Promise<Ethereum.Block.Transaction<"private"> | null> {
    const blockchain = this.#blockchain;
    const block = await blockchain.blocks
      .getByHash(hash)
      .catch<Block>(_ => null);
    if (!block) return null;
    const transactions = block.getTransactions();
    return transactions[Quantity.toNumber(index)].toJSON(blockchain.common);
  }

  /**
   * Returns information about a transaction by block number and transaction index position.
   * @param number - A block number, or the string "earliest", "latest" or "pending".
   * @param index - Integer of the transaction index position.
   * @returns The transaction object or `null` if no transaction was found.
   *
   * * `hash`: `DATA`, 32 Bytes - The transaction hash.
   * * `nonce`: `QUANTITY` - The number of transactions made by the sender prior to this one.
   * * `blockHash`: `DATA`, 32 Bytes - The hash of the block the transaction is in. `null` when pending.
   * * `blockNumber`: `QUANTITY` - The number of the block the transaction is in. `null` when pending.
   * * `transactionIndex`: `QUANTITY` - The index position of the transaction in the block.
   * * `from`: `DATA`, 20 Bytes - The address the transaction is sent from.
   * * `to`: `DATA`, 20 Bytes - The address the transaction is sent to.
   * * `value`: `QUANTITY` - The value transferred in wei.
   * * `gas`: `QUANTITY` - The gas provided by the sender.
   * * `gasPrice`: `QUANTITY` - The price of gas in wei.
   * * `input`: `DATA` - The data sent along with the transaction.
   * * `v`: `QUANTITY` - ECDSA recovery id.
   * * `r`: `DATA`, 32 Bytes - ECDSA signature r.
   * * `s`: `DATA`, 32 Bytes - ECDSA signature s.
   *
   * @example
   * ```javascript
   * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
   * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
   * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   * const { transactionIndex } = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
   *
   * const tx = await provider.request({ method: "eth_getTransactionByBlockNumberAndIndex", params: [ "latest", transactionIndex ] });
   * console.log(tx);
   * ```
   */
  @assertArgLength(2)
  async eth_getTransactionByBlockNumberAndIndex(
    number: QUANTITY | Ethereum.Tag,
    index: QUANTITY
  ): Promise<Ethereum.Block.Transaction<"private"> | null> {
    const blockchain = this.#blockchain;
    const block = await blockchain.blocks.get(number).catch<Block>(_ => null);
    if (!block) return null;
    const transactions = block.getTransactions();
    return transactions[Quantity.toNumber(index)].toJSON(blockchain.common);
  }

  /**
   * Returns the number of uncles in a block from a block matching the given block hash.
   * @param hash - Hash of a block.
   * @returns The number of uncles in a block.
   * @example
   * ```javascript
   * const blockHash = await provider.send("eth_getBlockByNumber", ["latest"] );
   * const uncleCount = await provider.send("eth_getUncleCountByBlockHash", [blockHash] );
   * console.log(uncleCount);
   * ```
   */
  @assertArgLength(1)
  async eth_getUncleCountByBlockHash(hash: DATA) {
    return Quantity.Zero;
  }

  /**
   * Returns the number of uncles in a block from a block matching the given block hash.
   * @param blockNumber - A block number, or the string "earliest", "latest" or "pending".
   * @returns The number of uncles in a block.
   * @example
   * ```javascript
   * const uncleCount = await provider.send("eth_getUncleCountByBlockNumber", ["latest"] );
   * console.log(uncleCount);
   * ```
   */
  @assertArgLength(1)
  async eth_getUncleCountByBlockNumber(blockNumber: QUANTITY | Ethereum.Tag) {
    return Quantity.Zero;
  }

  /**
   * Returns information about a uncle of a block by hash and uncle index position.
   *
   * @param hash - Hash of a block.
   * @param index - The uncle's index position.
   * @returns A block object or `null` when no block is found.
   *
   * * `hash`: `DATA`, 32 Bytes - Hash of the block. `null` when pending.
   * * `parentHash`: `DATA`, 32 Bytes - Hash of the parent block.
   * * `sha3Uncles`: `DATA`, 32 Bytes - SHA3 of the uncles data in the block.
   * * `miner`: `DATA`, 20 Bytes -  Address of the miner.
   * * `stateRoot`: `DATA`, 32 Bytes - The root of the state trie of the block.
   * * `transactionsRoot`: `DATA`, 32 Bytes - The root of the transaction trie of the block.
   * * `receiptsRoot`: `DATA`, 32 Bytes - The root of the receipts trie of the block.
   * * `logsBloom`: `DATA`, 256 Bytes - The bloom filter for the logs of the block. `null` when pending.
   * * `difficulty`: `QUANTITY` - Integer of the difficulty of this block.
   * * `number`: `QUANTITY` - The block number. `null` when pending.
   * * `gasLimit`: `QUANTITY` - The maximum gas allowed in the block.
   * * `gasUsed`: `QUANTITY` - Total gas used by all transactions in the block.
   * * `timestamp`: `QUANTITY` - The unix timestamp for when the block was collated.
   * * `extraData`: `DATA` - Extra data for the block.
   * * `mixHash`: `DATA`, 256 Bytes - Hash identifier for the block.
   * * `nonce`: `DATA`, 8 Bytes - Hash of the generated proof-of-work. `null` when pending.
   * * `totalDifficulty`: `QUANTITY` - Integer of the total difficulty of the chain until this block.
   * * `size`: `QUANTITY` - Integer the size of the block in bytes.
   * * `uncles`: `Array` - Array of uncle hashes.
   *
   * **NOTE: **The return does not contain a list of transactions in the uncle
   * block, to get this, make another request to `eth_getBlockByHash`.
   *
   * @example
   * ```javascript
   * const blockHash = await provider.send("eth_getBlockByNumber", ["latest"] );
   * const block = await provider.send("eth_getUncleByBlockHashAndIndex", [blockHash, "0x0"] );
   * console.log(block);
   * ```
   */
  @assertArgLength(2)
  async eth_getUncleByBlockHashAndIndex(hash: DATA, index: QUANTITY) {
    return null as Omit<Ethereum.Block<true>, "transactions">;
  }

  /**
   * Returns information about a uncle of a block by hash and uncle index position.
   *
   * @param blockNumber - A block number, or the string "earliest", "latest" or "pending".
   * @param uncleIndex - The uncle's index position.
   * @returns A block object or `null` when no block is found.
   *
   * * `hash`: `DATA`, 32 Bytes - Hash of the block. `null` when pending.
   * * `parentHash`: `DATA`, 32 Bytes - Hash of the parent block.
   * * `sha3Uncles`: `DATA`, 32 Bytes - SHA3 of the uncles data in the block.
   * * `miner`: `DATA`, 20 Bytes -  Address of the miner.
   * * `stateRoot`: `DATA`, 32 Bytes - The root of the state trie of the block.
   * * `transactionsRoot`: `DATA`, 32 Bytes - The root of the transaction trie of the block.
   * * `receiptsRoot`: `DATA`, 32 Bytes - The root of the receipts trie of the block.
   * * `logsBloom`: `DATA`, 256 Bytes - The bloom filter for the logs of the block. `null` when pending.
   * * `difficulty`: `QUANTITY` - Integer of the difficulty of this block.
   * * `number`: `QUANTITY` - The block number. `null` when pending.
   * * `gasLimit`: `QUANTITY` - The maximum gas allowed in the block.
   * * `gasUsed`: `QUANTITY` - Total gas used by all transactions in the block.
   * * `timestamp`: `QUANTITY` - The unix timestamp for when the block was collated.
   * * `extraData`: `DATA` - Extra data for the block.
   * * `mixHash`: `DATA`, 256 Bytes - Hash identifier for the block.
   * * `nonce`: `DATA`, 8 Bytes - Hash of the generated proof-of-work. `null` when pending.
   * * `totalDifficulty`: `QUANTITY` - Integer of the total difficulty of the chain until this block.
   * * `size`: `QUANTITY` - Integer the size of the block in bytes.
   * * `uncles`: `Array` - Array of uncle hashes.
   *
   * * **NOTE: **The return does not contain a list of transactions in the uncle
   * block, to get this, make another request to `eth_getBlockByHash`.
   *
   * @example
   * ```javascript
   * const block = await provider.send("eth_getUncleByBlockNumberAndIndex", ["latest", "0x0"] );
   * console.log(block);
   * ```
   */
  @assertArgLength(2)
  async eth_getUncleByBlockNumberAndIndex(
    blockNumber: QUANTITY | Ethereum.Tag,
    uncleIndex: QUANTITY
  ) {
    return null as Omit<Ethereum.Block<true>, "transactions">;
  }

  /**
   * Returns: An Array with the following elements
   * 1: `DATA`, 32 Bytes - current block header pow-hash
   * 2: `DATA`, 32 Bytes - the seed hash used for the DAG.
   * 3: `DATA`, 32 Bytes - the boundary condition ("target"), 2^256 / difficulty.
   *
   * @param filterId - A filter id.
   * @returns The hash of the current block, the seedHash, and the boundary condition to be met ("target").
   * @example
   * ```javascript
   * console.log(await provider.send("eth_getWork", ["0x0"] ));
   * ```
   */
  @assertArgLength(1)
  async eth_getWork(filterId: QUANTITY) {
    return [] as [string, string, string] | [];
  }

  /**
   * Used for submitting a proof-of-work solution.
   *
   * @param nonce - The nonce found (64 bits).
   * @param powHash - The header's pow-hash (256 bits).
   * @param digest - The mix digest (256 bits).
   * @returns `true` if the provided solution is valid, otherwise `false`.
   * @example
   * ```javascript
   * const nonce = "0xe0df4bd14ab39a71";
   * const powHash = "0x0000000000000000000000000000000000000000000000000000000000000001";
   * const digest = "0xb2222a74119abd18dbcb7d1f661c6578b7bbeb4984c50e66ed538347f606b971";
   * const result = await provider.request({ method: "eth_submitWork", params: [nonce, powHash, digest] });
   * console.log(result);
   * ```
   */
  @assertArgLength(3)
  async eth_submitWork(nonce: DATA, powHash: DATA, digest: DATA) {
    return false;
  }

  /**
   * Used for submitting mining hashrate.
   *
   * @param hashRate - A hexadecimal string representation (32 bytes) of the hash rate.
   * @param clientID - A random hexadecimal(32 bytes) ID identifying the client.
   * @returns `true` if submitting went through successfully and `false` otherwise.
   * @example
   * ```javascript
   * const hashRate = "0x0000000000000000000000000000000000000000000000000000000000000001";
   * const clientId = "0xb2222a74119abd18dbcb7d1f661c6578b7bbeb4984c50e66ed538347f606b971";
   * const result = await provider.request({ method: "eth_submitHashrate", params: [hashRate, clientId] });
   * console.log(result);
   * ```
   */
  @assertArgLength(2)
  async eth_submitHashrate(hashRate: DATA, clientID: DATA) {
    return false;
  }

  /**
   * Returns `true` if client is actively mining new blocks.
   * @returns returns `true` if the client is mining, otherwise `false`.
   * @example
   * ```javascript
   * const isMining = await provider.request({ method: "eth_mining", params: [] });
   * console.log(isMining);
   * ```
   */
  @assertArgLength(0)
  async eth_mining() {
    // we return the blockchain's started state
    return this.#blockchain.isStarted();
  }

  /**
   * Returns the number of hashes per second that the node is mining with.
   * @returns Number of hashes per second.
   * @example
   * ```javascript
   * const hashrate = await provider.request({ method: "eth_hashrate", params: [] });
   * console.log(hashrate);
   * ```
   */
  @assertArgLength(0)
  async eth_hashrate() {
    return Quantity.Zero;
  }

  /**
   * Returns the current price per gas in wei.
   * @returns Integer of the current gas price in wei.
   * @example
   * ```javascript
   * const gasPrice = await provider.request({ method: "eth_gasPrice", params: [] });
   * console.log(gasPrice);
   * ```
   */
  @assertArgLength(0)
  async eth_gasPrice() {
    return this.#options.miner.defaultGasPrice;
  }

  /**
   * Returns a `maxPriorityFeePerGas` value suitable for quick transaction inclusion.
   * @returns The maxPriorityFeePerGas in wei.
   * @example
   * ```javascript
   * const suggestedTip = await provider.request({ method: "eth_maxPriorityFeePerGas", params: [] });
   * console.log(suggestedTip);
   * ```
   */
  @assertArgLength(0)
  async eth_maxPriorityFeePerGas() {
    return Quantity.Gwei;
  }

  /**
   * Returns a list of addresses owned by client.
   * @returns Array of 20 Bytes - addresses owned by the client.
   * @example
   * ```javascript
   * const accounts = await provider.request({ method: "eth_accounts", params: [] });
   * console.log(accounts);
   * ```
   */
  @assertArgLength(0)
  async eth_accounts() {
    return this.#wallet.addresses;
  }

  /**
   * Returns the number of the most recent block.
   * @returns The current block number the client is on.
   * @example
   * ```javascript
   * const blockNumber = await provider.request({ method: "eth_blockNumber" });
   * console.log(blockNumber);
   * ```
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
   * @param address - Address to check for balance.
   * @param blockNumber - Integer block number, or the string "latest", "earliest"
   *  or "pending".
   *
   * @returns Integer of the account balance in wei.
   *
   * @example
   * ```javascript
   * const accounts = await provider.request({ method: "eth_accounts", params: [] });
   * const balance = await provider.request({ method: "eth_getBalance", params: [accounts[0], "latest"] });
   * console.log(balance);
   * ```
   */
  @assertArgLength(1, 2)
  async eth_getBalance(
    address: DATA,
    blockNumber: QUANTITY | Ethereum.Tag = Tag.latest
  ) {
    return this.#blockchain.accounts.getBalance(
      Address.from(address),
      blockNumber
    );
  }

  /**
   * Returns code at a given address.
   *
   * @param address - Address.
   * @param blockNumber - Integer block number, or the string "latest", "earliest" or "pending".
   * @returns The code from the given address.
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
   * const txReceipt = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
   * const code = await provider.request({ method: "eth_getCode", params: [txReceipt.contractAddress, "latest"] });
   * console.log(code);
   * ```
   */
  @assertArgLength(1, 2)
  async eth_getCode(
    address: DATA,
    blockNumber: QUANTITY | Ethereum.Tag = Tag.latest
  ) {
    const { accounts } = this.#blockchain;
    return accounts.getCode(Address.from(address), blockNumber);
  }

  /**
   * Returns the value from a storage position at a given address.
   * @param address - Address of the storage.
   * @param position - Integer of the position in the storage.
   * @param blockNumber - Integer block number, or the string "latest", "earliest"
   *  or "pending".
   * @returns The value in storage at the requested position.
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
   * const txReceipt = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
   * const storageValue = await provider.request({ method: "eth_getStorageAt", params: [txReceipt.contractAddress, "0x0", "latest"] });
   * console.log(storageValue);
   * ```
   */
  @assertArgLength(2, 3)
  async eth_getStorageAt(
    address: DATA,
    position: QUANTITY,
    blockNumber: QUANTITY | Ethereum.Tag = Tag.latest
  ) {
    const blockchain = this.#blockchain;
    const blockNum = blockchain.blocks.getEffectiveNumber(blockNumber);
    const block = await blockchain.blocks.getRawByBlockNumber(blockNum);

    if (!block) throw new Error("header not found");

    const [[, , , blockStateRoot]] = decode<GanacheRawBlock>(block);
    const trie = blockchain.trie.copy(false);
    trie.setContext(blockStateRoot, null, blockNum);

    const posBuff = Quantity.toBuffer(position);
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

    const addressBuf = Address.from(address).toBuffer();
    const addressData = await trie.get(addressBuf);
    // An address's stateRoot is stored in the 3rd rlp entry
    const addressStateRoot = decode<EthereumRawAccount>(addressData)[2];
    trie.setContext(addressStateRoot, addressBuf, blockNum);
    const value = await trie.get(paddedPosBuff);
    return Data.from(decode(value));
  }

  /**
   * Returns the information about a transaction requested by transaction hash.
   *
   * @param transactionHash - Hash of a transaction.
   * @returns The transaction object or `null` if no transaction was found.
   *
   * * `hash`: `DATA`, 32 Bytes - The transaction hash.
   * * `nonce`: `QUANTITY` - The number of transactions made by the sender prior to this one.
   * * `blockHash`: `DATA`, 32 Bytes - The hash of the block the transaction is in. `null` when pending.
   * * `blockNumber`: `QUANTITY` - The number of the block the transaction is in. `null` when pending.
   * * `transactionIndex`: `QUANTITY` - The index position of the transaction in the block.
   * * `from`: `DATA`, 20 Bytes - The address the transaction is sent from.
   * * `to`: `DATA`, 20 Bytes - The address the transaction is sent to.
   * * `value`: `QUANTITY` - The value transferred in wei.
   * * `gas`: `QUANTITY` - The gas provided by the sender.
   * * `gasPrice`: `QUANTITY` - The price of gas in wei.
   * * `input`: `DATA` - The data sent along with the transaction.
   * * `v`: `QUANTITY` - ECDSA recovery id.
   * * `r`: `DATA`, 32 Bytes - ECDSA signature r.
   * * `s`: `DATA`, 32 Bytes - ECDSA signature s.
   *
   * @example
   * ```javascript
   * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
   * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
   * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   *
   * const tx = await provider.request({ method: "eth_getTransactionByHash", params: [ txHash ] });
   * console.log(tx);
   * ```
   */
  @assertArgLength(1)
  async eth_getTransactionByHash(
    transactionHash: DATA
  ): Promise<
    | Ethereum.Block.Transaction<"private">
    | Ethereum.Pool.Transaction<"private">
    | null
  > {
    const { transactions } = this.#blockchain;
    const hashBuffer = Data.toBuffer(transactionHash);

    // we must check the database before checking the pending cache, because the
    // cache is updated _after_ the transaction is already in the database, and
    // the database contains block info whereas the pending cache doesn't.
    const transaction = await transactions.get(hashBuffer);

    if (transaction === null) {
      // if we can't find it in the list of pending transactions, check the db!
      const tx = transactions.transactionPool.find(hashBuffer);
      return tx ? tx.toJSON(this.#blockchain.common) : null;
    } else {
      return transaction.toJSON(this.#blockchain.common);
    }
  }

  /**
   * Returns the receipt of a transaction by transaction hash.
   *
   * Note: The receipt is not available for pending transactions.
   *
   * @param transactionHash - Hash of a transaction.
   * @returns Returns the receipt of a transaction by transaction hash.
   * @example
   * ```javascript
   * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
   * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
   * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   *
   * const txReceipt = await provider.request({ method: "eth_getTransactionReceipt", params: [ txHash ] });
   * console.log(txReceipt);
   * ```
   */
  @assertArgLength(1)
  async eth_getTransactionReceipt(
    transactionHash: DATA
  ): Promise<Ethereum.Transaction.Receipt<"private">> {
    const { transactions, transactionReceipts, blocks, common } =
      this.#blockchain;
    const dataHash = Data.from(transactionHash);
    const txHash = dataHash.toBuffer();

    const transactionPromise = transactions.get(txHash);
    const receiptPromise = transactionReceipts.get(txHash);
    const blockPromise = transactionPromise.then(t =>
      t ? blocks.get(t.blockNumber.toBuffer()) : null
    );
    const [transaction, receipt, block] = await Promise.all([
      transactionPromise,
      receiptPromise,
      blockPromise
    ]);
    if (transaction) {
      return receipt.toJSON(block, transaction, common);
    }

    // if we are performing "strict" instamining, then check to see if the
    // transaction is pending so as to warn about the v7 instamine changes
    const options = this.#options;
    if (
      options.miner.blockTime <= 0 &&
      options.miner.instamine === "strict" &&
      this.#blockchain.isStarted()
    ) {
      const tx = this.#blockchain.transactions.transactionPool.find(txHash);
      if (tx != null) {
        options.logging.logger.log(
          " > Ganache `eth_getTransactionReceipt` notice: the transaction with hash\n" +
            ` > \`${dataHash.toString()}\` has not\n` +
            " > yet been mined." +
            " See https://trfl.io/v7-instamine for additional information."
        );
      }
    }
    return null;
  }

  /**
   * Creates new message call transaction or a contract creation, if the data field contains code.
   *
   * Transaction call object:
   * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
   * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
   * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
   * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
   * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
   * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
   *
   * @param transaction - The transaction call object as seen in source.
   * @returns The transaction hash.
   * @example
   * ```javascript
   * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
   * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
   * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   * console.log(txHash);
   * ```
   */
  @assertArgLength(1)
  async eth_sendTransaction(transaction: Ethereum.Transaction): Promise<Data> {
    const blockchain = this.#blockchain;

    const tx = TransactionFactory.fromRpc(
      transaction as Transaction,
      blockchain.common
    );
    if (tx.from == null) {
      throw new Error("from not found; is required");
    }
    const fromString = tx.from.toString();

    const wallet = this.#wallet;
    const isKnownAccount = wallet.knownAccounts.has(fromString);
    const privateKey = wallet.unlockedAccounts.get(fromString);

    if (privateKey === undefined) {
      const msg = isKnownAccount
        ? "authentication needed: passphrase or unlock"
        : "sender account not recognized";
      throw new Error(msg);
    }

    await autofillDefaultTransactionValues(
      tx,
      this.eth_estimateGas.bind(this),
      this.eth_maxPriorityFeePerGas,
      transaction,
      blockchain,
      this.#options
    );

    return blockchain.queueTransaction(tx, privateKey);
  }

  /**
   * Signs a transaction that can be submitted to the network at a later time using `eth_sendRawTransaction`.
   *
   * Transaction call object:
   * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
   * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
   * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
   * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
   * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
   * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
   *
   * @param transaction - The transaction call object as seen in source.
   * @returns The raw, signed transaction.
   * @example
   * ```javascript
   * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
   * const signedTx = await provider.request({ method: "eth_signTransaction", params: [{ from, to }] });
   * console.log(signedTx)
   * ```
   */
  @assertArgLength(1)
  async eth_signTransaction(transaction: Ethereum.Transaction): Promise<Data> {
    const blockchain = this.#blockchain;
    const tx = TransactionFactory.fromRpc(
      transaction as Transaction,
      blockchain.common
    );

    if (tx.from == null) {
      throw new Error("from not found; is required");
    }
    const fromString = tx.from.toString();

    const wallet = this.#wallet;
    const isKnownAccount = wallet.knownAccounts.has(fromString);
    const privateKey = wallet.unlockedAccounts.get(fromString);

    if (privateKey === undefined) {
      const msg = isKnownAccount
        ? "authentication needed: passphrase or unlock"
        : "sender account not recognized";
      throw new Error(msg);
    }

    tx.signAndHash(privateKey.toBuffer());
    return Data.from(tx.serialized);
  }
  /**
   * Creates new message call transaction or a contract creation for signed transactions.
   * @param transaction - The signed transaction data.
   * @returns The transaction hash.
   * @example
   * ```javascript
   * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
   * const signedTx = await provider.request({ method: "eth_signTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
   * const txHash = await provider.send("eth_sendRawTransaction", [signedTx] );
   * console.log(txHash);
   * ```
   */
  @assertArgLength(1)
  async eth_sendRawTransaction(transaction: string) {
    const blockchain = this.#blockchain;
    const tx = TransactionFactory.fromString(transaction, blockchain.common);
    return blockchain.queueTransaction(tx);
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
   * @param address - Address to sign with.
   * @param message - Message to sign.
   * @returns Signature - a hex encoded 129 byte array
   * starting with `0x`. It encodes the `r`, `s`, and `v` parameters from
   * appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf)
   *  in big-endian format. Bytes 0...64 contain the `r` parameter, bytes
   * 64...128 the `s` parameter, and the last byte the `v` parameter. Note
   * that the `v` parameter includes the chain id as specified in [EIP-155](https://eips.ethereum.org/EIPS/eip-155).
   * @example
   * ```javascript
   * const [account] = await provider.request({ method: "eth_accounts", params: [] });
   * const msg = "0x307866666666666666666666";
   * const signature = await provider.request({ method: "eth_sign", params: [account, msg] });
   * console.log(signature);
   * ```
   */
  @assertArgLength(2)
  async eth_sign(address: DATA, message: DATA) {
    const account = Address.from(address).toString().toLowerCase();

    const privateKey = this.#wallet.unlockedAccounts.get(account);
    if (privateKey == null) {
      throw new Error("cannot sign data; no private key");
    }

    const messageHash = hashPersonalMessage(Data.toBuffer(message));
    const { v, r, s } = ecsign(messageHash, privateKey.toBuffer());
    return toRpcSig(v, r, s);
  }

  /**
   * Identical to eth_signTypedData_v4.
   *
   * @param address - Address of the account that will sign the messages.
   * @param typedData - Typed structured data to be signed.
   * @returns Signature. As in `eth_sign`, it is a hex encoded 129 byte array
   * starting with `0x`. It encodes the `r`, `s`, and `v` parameters from
   * appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf)
   *  in big-endian format. Bytes 0...64 contain the `r` parameter, bytes
   * 64...128 the `s` parameter, and the last byte the `v` parameter. Note
   * that the `v` parameter includes the chain id as specified in [EIP-155](https://eips.ethereum.org/EIPS/eip-155).
   * @EIP [712](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md)
   * @example
   * ```javascript
   * const [account] = await provider.request({ method: "eth_accounts", params: [] });
   * const typedData = {
   *  types: {
   *    EIP712Domain: [
   *      { name: 'name', type: 'string' },
   *      { name: 'version', type: 'string' },
   *      { name: 'chainId', type: 'uint256' },
   *      { name: 'verifyingContract', type: 'address' },
   *    ],
   *    Person: [
   *      { name: 'name', type: 'string' },
   *      { name: 'wallet', type: 'address' }
   *    ],
   *    Mail: [
   *      { name: 'from', type: 'Person' },
   *      { name: 'to', type: 'Person' },
   *      { name: 'contents', type: 'string' }
   *    ],
   *  },
   *  primaryType: 'Mail',
   *  domain: {
   *    name: 'Ether Mail',
   *    version: '1',
   *    chainId: 1,
   *    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
   *  },
   *  message: {
   *    from: {
   *      name: 'Cow',
   *      wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
   *    },
   *    to: {
   *      name: 'Bob',
   *      wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
   *    },
   *    contents: 'Hello, Bob!',
   *  },
   * };
   * const signature = await provider.request({ method: "eth_signTypedData", params: [account, typedData] });
   * console.log(signature);
   * ```
   */
  @assertArgLength(2)
  async eth_signTypedData(address: DATA, typedData: Ethereum.TypedData) {
    return this.eth_signTypedData_v4(address, typedData);
  }

  /**
   *
   * @param address - Address of the account that will sign the messages.
   * @param typedData - Typed structured data to be signed.
   * @returns Signature. As in `eth_sign`, it is a hex encoded 129 byte array
   * starting with `0x`. It encodes the `r`, `s`, and `v` parameters from
   * appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf)
   *  in big-endian format. Bytes 0...64 contain the `r` parameter, bytes
   * 64...128 the `s` parameter, and the last byte the `v` parameter. Note
   * that the `v` parameter includes the chain id as specified in [EIP-155](https://eips.ethereum.org/EIPS/eip-155).
   * @EIP [712](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md)
   * @example
   * ```javascript
   * const [account] = await provider.request({ method: "eth_accounts", params: [] });
   * const typedData = {
   *  types: {
   *    EIP712Domain: [
   *      { name: 'name', type: 'string' },
   *      { name: 'version', type: 'string' },
   *      { name: 'chainId', type: 'uint256' },
   *      { name: 'verifyingContract', type: 'address' },
   *    ],
   *    Person: [
   *      { name: 'name', type: 'string' },
   *      { name: 'wallet', type: 'address' }
   *    ],
   *    Mail: [
   *      { name: 'from', type: 'Person' },
   *      { name: 'to', type: 'Person' },
   *      { name: 'contents', type: 'string' }
   *    ],
   *  },
   *  primaryType: 'Mail',
   *  domain: {
   *    name: 'Ether Mail',
   *    version: '1',
   *    chainId: 1,
   *    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
   *  },
   *  message: {
   *    from: {
   *      name: 'Cow',
   *      wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
   *    },
   *    to: {
   *      name: 'Bob',
   *      wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
   *    },
   *    contents: 'Hello, Bob!',
   *  },
   * };
   * const signature = await provider.request({ method: "eth_signTypedData_v4", params: [account, typedData] });
   * console.log(signature);
   * ```
   */
  @assertArgLength(2)
  async eth_signTypedData_v4(address: DATA, typedData: Ethereum.TypedData) {
    const account = Address.from(address).toString().toLowerCase();

    const privateKey = this.#wallet.unlockedAccounts.get(account);
    if (privateKey == null) {
      throw new Error("cannot sign data; no private key");
    }

    if (typeof typedData === "string") {
      throw new Error("cannot sign data; string sent, expected object");
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
   * @param subscriptionName - Name for the subscription.
   * @returns A subscription id.
   * @example
   * ```javascript
   * const subscriptionId = await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
   * console.log(subscriptionId);
   * ```
   */
  eth_subscribe(
    subscriptionName: Ethereum.SubscriptionName
  ): PromiEvent<Quantity>;
  /**
   * Starts a subscription to a particular event. For every event that matches
   * the subscription a JSON-RPC notification with event details and
   * subscription ID will be sent to a client.
   *
   * @param subscriptionName -
   * @param options - Filter options:
   *  * `address`: either an address or an array of addresses. Only logs that
   *    are created from these addresses are returned
   *  * `topics`, only logs which match the specified topics
   * @returns A subscription id.
   */
  eth_subscribe(
    subscriptionName: Extract<Ethereum.SubscriptionName, "logs">,
    options: Ethereum.SubscriptionOptions
  ): PromiEvent<Quantity>;
  @assertArgLength(1, 2)
  eth_subscribe(
    subscriptionName: Ethereum.SubscriptionName,
    options?: Ethereum.SubscriptionOptions
  ): PromiEvent<Quantity> {
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
          if (header.baseFeePerGas !== undefined) {
            (result as any).baseFeePerGas = header.baseFeePerGas;
          }
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
      case "logs": {
        const subscription = this.#getId();
        const promiEvent = PromiEvent.resolve(subscription);

        const { addresses, topics } = options
          ? parseFilterDetails(options)
          : { addresses: [], topics: [] };
        const unsubscribe = this.#blockchain.on(
          "blockLogs",
          (blockLogs: BlockLogs) => {
            for (const log of blockLogs.filter(addresses, topics)) {
              promiEvent.emit("message", {
                type: "eth_subscription",
                data: {
                  result: log,
                  subscription: subscription.toString()
                }
              });
            }
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
          (transaction: TypedTransaction) => {
            const result = transaction.hash.toString();
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
          JsonRpcErrorCode.METHOD_NOT_FOUND
        );
    }
  }

  /**
   * Cancel a subscription to a particular event. Returns a boolean indicating
   * if the subscription was successfully cancelled.
   *
   * @param subscriptionId - The ID of the subscription to unsubscribe to.
   * @returns `true` if subscription was cancelled successfully, otherwise `false`.
   * @example
   * ```javascript
   * const subscriptionId = await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
   * const result = await provider.request({ method: "eth_unsubscribe", params: [subscriptionId] });
   * console.log(result);
   * ```
   */
  @assertArgLength(1)
  async eth_unsubscribe(subscriptionId: Ethereum.SubscriptionId) {
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
   * @example
   * ```javascript
   * const filterId = await provider.request({ method: "eth_newBlockFilter", params: [] });
   * console.log(filterId);
   * ```
   */
  @assertArgLength(0)
  async eth_newBlockFilter(): Promise<Quantity> {
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
   * @example
   * ```javascript
   * const filterId = await provider.request({ method: "eth_newPendingTransactionFilter", params: [] });
   * console.log(filterId);
   * ```
   */
  @assertArgLength(0)
  async eth_newPendingTransactionFilter(): Promise<Quantity> {
    const unsubscribe = this.#blockchain.on(
      "pendingTransaction",
      (transaction: TypedTransaction) => {
        value.updates.push(transaction.hash);
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
   * Filter options:
   * * `fromBlock`: `QUANTITY | TAG` (optional) - Integer block number, or the string "latest", "earliest"
   * or "pending".
   * * `toBlock`: `QUANTITY | TAG` (optional) - Integer block number, or the string "latest", "earliest"
   * or "pending".
   * * `address`: `DATA | Array` (optional) - Contract address or a list of addresses from which the logs should originate.
   * * `topics`: `Array of DATA` (optional) - Array of 32 Bytes `DATA` topics. Topics are order-dependent. Each topic can also
   * be an array of `DATA` with "or" options.
   *
   * @param filter - The filter options as seen in source.
   *
   * @returns A filter id.
   * @example
   * ```javascript
   * const filterId = await provider.request({ method: "eth_newFilter", params: [] });
   * console.log(filterId);
   * ```
   */
  @assertArgLength(0, 1)
  async eth_newFilter(filter?: Ethereum.Filter): Promise<Quantity> {
    const blockchain = this.#blockchain;
    if (filter == null) filter = {};
    const { addresses, topics } = parseFilterDetails(filter || {});
    const unsubscribe = blockchain.on("blockLogs", (blockLogs: BlockLogs) => {
      const blockNumber = blockLogs.blockNumber;
      // every time we get a blockLogs message we re-check what the filter's
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
   * @param filterId - The filter id.
   * @returns An array of logs, block hashes, or transaction hashes, depending
   * on the filter type, which occurred since last poll.
   *
   * For filters created with `eth_newBlockFilter` the return are block hashes (`DATA`, 32 Bytes).
   *
   * For filters created with `eth_newPendingTransactionFilter` the return are transaction hashes (`DATA`, 32 Bytes).
   *
   * For filters created with `eth_newFilter` the return are log objects with the following parameters:
   * * `removed`: `TAG` - `true` when the log was removed, `false` if its a valid log.
   * * `logIndex`: `QUANTITY` - Integer of the log index position in the block. `null` when pending.
   * * `transactionIndex`: `QUANTITY` - Integer of the transactions index position. `null` when pending.
   * * `transactionHash`: `DATA`, 32 Bytes - Hash of the transaction where the log was. `null` when pending.
   * * `blockHash`: `DATA`, 32 Bytes - Hash of the block where the log was. `null` when pending.
   * * `blockNumber`: `QUANTITY` - The block number where the log was in. `null` when pending.
   * * `address`: `DATA`, 20 Bytes - The address from which the log originated.
   * * `data`: `DATA` - Contains one or more 32 Bytes non-indexed arguments of the log.
   * * `topics`: `Array of DATA` - Array of 0 to 4 32 Bytes `DATA` of indexed log arguments.
   *
   * @example
   * ```javascript
   * // Logs.sol
   * // // SPDX-License-Identifier: MIT
   * // pragma solidity ^0.7.4;
   * // contract Logs {
   * //   event Event(uint256 indexed first, uint256 indexed second);
   * //   constructor() {
   * //     emit Event(1, 2);
   * //   }
   * //
   * //   function logNTimes(uint8 n) public {
   * //     for (uint8 i = 0; i < n; i++) {
   * //       emit Event(i, i);
   * //     }
   * //   }
   * // }
   *
   * const logsContract = "0x608060405234801561001057600080fd5b50600260017f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a360e58061004f6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80635e19e69f14602d575b600080fd5b605960048036036020811015604157600080fd5b81019080803560ff169060200190929190505050605b565b005b60005b8160ff168160ff16101560ab578060ff168160ff167f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a38080600101915050605e565b505056fea26469706673582212201af9c13c7b00e2b628c1258d45f9f62d2aad8cd32fc32fd9515d8ad1e792679064736f6c63430007040033";
   * const [from] = await provider.send("eth_accounts");
   * const filterId = await provider.send("eth_newFilter");
   *
   * const subscriptionId = await provider.send("eth_subscribe", ["newHeads"]);
   * await provider.send("eth_sendTransaction", [{ from, data: logsContract, gas: "0x5b8d80" }] );
   * await provider.once("message");
   *
   * const changes = await provider.request({ method: "eth_getFilterChanges", params: [filterId] });
   * console.log(changes);
   *
   * await provider.send("eth_unsubscribe", [subscriptionId]);
   * ```
   */
  @assertArgLength(1)
  async eth_getFilterChanges(filterId: QUANTITY): Promise<Data[]> {
    const filter = this.#filters.get(Quantity.toString(filterId));
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
   * @param filterId - The filter id.
   * @returns `true` if the filter was successfully uninstalled, otherwise
   * `false`.
   * @example
   * ```javascript
   * const filterId = await provider.request({ method: "eth_newFilter", params: [] });
   * const result = await provider.request({ method: "eth_uninstallFilter", params: [filterId] });
   * console.log(result);
   * ```
   */
  @assertArgLength(1)
  async eth_uninstallFilter(filterId: QUANTITY): Promise<boolean> {
    const id = Quantity.toString(filterId);
    const filter = this.#filters.get(id);
    if (!filter) return false;
    filter.unsubscribe();
    return this.#filters.delete(id);
  }

  /**
   * Returns an array of all logs matching filter with given id.
   *
   * @param filterId - The filter id.
   * @returns Array of log objects, or an empty array.
   * @example
   * ```javascript
   * // Logs.sol
   * // // SPDX-License-Identifier: MIT
   * // pragma solidity ^0.7.4;
   * // contract Logs {
   * //   event Event(uint256 indexed first, uint256 indexed second);
   * //   constructor() {
   * //     emit Event(1, 2);
   * //   }
   * //
   * //   function logNTimes(uint8 n) public {
   * //     for (uint8 i = 0; i < n; i++) {
   * //       emit Event(i, i);
   * //     }
   * //   }
   * // }
   *
   * const logsContract = "0x608060405234801561001057600080fd5b50600260017f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a360e58061004f6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80635e19e69f14602d575b600080fd5b605960048036036020811015604157600080fd5b81019080803560ff169060200190929190505050605b565b005b60005b8160ff168160ff16101560ab578060ff168160ff167f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a38080600101915050605e565b505056fea26469706673582212201af9c13c7b00e2b628c1258d45f9f62d2aad8cd32fc32fd9515d8ad1e792679064736f6c63430007040033";
   * const [from] = await provider.send("eth_accounts");
   * const filterId = await provider.send("eth_newFilter");
   *
   * await provider.send("eth_subscribe", ["newHeads"]);
   * await provider.send("eth_sendTransaction", [{ from, data: logsContract, gas: "0x5b8d80" }] );
   * await provider.once("message");
   *
   * const logs = await provider.request({ method: "eth_getFilterLogs", params: [filterId] });
   * console.log(logs);
   * ```
   */
  @assertArgLength(1)
  async eth_getFilterLogs(filterId: QUANTITY): Promise<Ethereum.Logs> {
    const filter = this.#filters.get(Quantity.toString(filterId));
    if (filter && filter.type === FilterTypes.log) {
      return this.eth_getLogs(filter.filter);
    } else {
      throw new Error("filter not found");
    }
  }

  /**
   * Returns an array of all logs matching a given filter object.
   *
   * Filter options:
   * * `fromBlock`: `QUANTITY | TAG` (optional) - Integer block number, or the string "latest", "earliest"
   * or "pending".
   * * `toBlock`: `QUANTITY | TAG` (optional) - Integer block number, or the string "latest", "earliest"
   * or "pending".
   * * `address`: `DATA | Array` (optional) - Contract address or a list of addresses from which the logs should originate.
   * * `topics`: `Array of DATA` (optional) - Array of 32 Bytes `DATA` topics. Topics are order-dependent. Each topic can also
   * be an array of `DATA` with "or" options.
   * * `blockHash`: `DATA`, 32 Bytes (optional) - Hash of the block to restrict logs from. If `blockHash` is present,
   * then neither `fromBlock` or `toBlock` are allowed.
   *
   * @param filter - The filter options as seen in source.
   * @returns Array of log objects, or an empty array.
   * @example
   * ```javascript
   * // Logs.sol
   * // // SPDX-License-Identifier: MIT
   * // pragma solidity ^0.7.4;
   * // contract Logs {
   * //   event Event(uint256 indexed first, uint256 indexed second);
   * //   constructor() {
   * //     emit Event(1, 2);
   * //   }
   * //
   * //   function logNTimes(uint8 n) public {
   * //     for (uint8 i = 0; i < n; i++) {
   * //       emit Event(i, i);
   * //     }
   * //   }
   * // }
   *
   * const logsContract = "0x608060405234801561001057600080fd5b50600260017f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a360e58061004f6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80635e19e69f14602d575b600080fd5b605960048036036020811015604157600080fd5b81019080803560ff169060200190929190505050605b565b005b60005b8160ff168160ff16101560ab578060ff168160ff167f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a38080600101915050605e565b505056fea26469706673582212201af9c13c7b00e2b628c1258d45f9f62d2aad8cd32fc32fd9515d8ad1e792679064736f6c63430007040033";
   * const [from] = await provider.send("eth_accounts");
   *
   * await provider.send("eth_subscribe", ["newHeads"]);
   * const txHash = await provider.send("eth_sendTransaction", [{ from, data: logsContract, gas: "0x5b8d80" }] );
   * await provider.once("message");
   *
   * const { contractAddress } = await provider.send("eth_getTransactionReceipt", [txHash] );
   *
   * const logs = await provider.request({ method: "eth_getLogs", params: [{ address: contractAddress }] });
   * console.log(logs);
   * ```
   */
  @assertArgLength(1)
  async eth_getLogs(filter: Ethereum.LogsFilter): Promise<Ethereum.Logs> {
    return this.#blockchain.blockLogs.getLogs(filter);
  }

  /**
   * Returns the number of transactions sent from an address.
   *
   * @param address - `DATA`, 20 Bytes - The address to get number of transactions sent from
   * @param blockNumber - Integer block number, or the string "latest", "earliest"
   * or "pending".
   * @returns Number of transactions sent from this address.
   * @example
   * ```javascript
   * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
   * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
   * await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   *
   * const txCount = await provider.request({ method: "eth_getTransactionCount", params: [ from, "latest" ] });
   * console.log(txCount);
   * ```
   */
  @assertArgLength(1, 2)
  async eth_getTransactionCount(
    address: DATA,
    blockNumber: QUANTITY | Ethereum.Tag = Tag.latest
  ): Promise<Quantity> {
    return this.#blockchain.accounts.getNonce(
      Address.from(address),
      blockNumber
    );
  }

  /**
   * Executes a new message call immediately without creating a transaction on the block chain.
   *
   * Transaction call object:
   * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
   * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
   * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
   * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
   * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
   * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
   *
   * State Override object - An address-to-state mapping, where each entry specifies some
   * state to be ephemerally overridden prior to executing the call. Each address maps to an
   * object containing:
   * * `balance`: `QUANTITY` (optional) - The balance to set for the account before executing the call.
   * * `nonce`: `QUANTITY` (optional) - The nonce to set for the account before executing the call.
   * * `code`: `DATA` (optional) - The EVM bytecode to set for the account before executing the call.
   * * `state`: `OBJECT` (optional*) - Key-value mapping to override *all* slots in the account storage before executing the call.
   * * `stateDiff`: `OBJECT` (optional*) - Key-value mapping to override *individual* slots in the account storage before executing the call.
   * * *Note - `state` and `stateDiff` fields are mutually exclusive.
   * @param transaction - The transaction call object as seen in source.
   * @param blockNumber - Integer block number, or the string "latest", "earliest"
   *  or "pending".
   * @param overrides - State overrides to apply during the simulation.
   *
   * @returns The return value of executed contract.
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
   * const txObj = { from, gas: "0x5b8d80", gasPrice: "0x1dfd14000", value:"0x0", data: simpleSol };
   * const slot = "0x0000000000000000000000000000000000000000000000000000000000000005"
   * const overrides = { [from]: { balance: "0x3e8", "nonce: "0x5", code: "0xbaddad42", stateDiff: { [slot]: "0xbaddad42"}}}
   * const result = await provider.request({ method: "eth_call", params: [txObj, "latest", overrides] });
   * console.log(result);
   * ```
   */
  @assertArgLength(1, 3)
  async eth_call(
    transaction: Ethereum.Call.Transaction,
    blockNumber: QUANTITY | Ethereum.Tag = Tag.latest,
    overrides: Ethereum.Call.Overrides = {}
  ): Promise<Data> {
    const blockchain = this.#blockchain;
    const common = blockchain.common;
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
      if (typeof transaction.input !== "undefined") {
        data = Data.from(transaction.input);
      }
    } else {
      data = Data.from(transaction.data);
    }

    // eth_call doesn't validate that the transaction has a sufficient
    // "effectiveGasPrice". however, if `maxPriorityFeePerGas` or
    // `maxFeePerGas` values are set, the baseFeePerGas is used to calculate
    // the effectiveGasPrice, which is used to calculate tx costs/refunds.
    const baseFeePerGasBigInt = parentBlock.header.baseFeePerGas
      ? parentBlock.header.baseFeePerGas.toBigInt()
      : undefined;

    let gasPrice: Quantity;
    const hasGasPrice = typeof transaction.gasPrice !== "undefined";
    // if the original block didn't have a `baseFeePerGas` (baseFeePerGasBigInt
    // is undefined) then EIP-1559 was not active on that block and we can't use
    // type 2 fee values (as they rely on the baseFee)
    if (!common.isActivatedEIP(1559) || baseFeePerGasBigInt === undefined) {
      gasPrice = Quantity.from(hasGasPrice ? 0 : transaction.gasPrice);
    } else {
      const hasMaxFeePerGas = typeof transaction.maxFeePerGas !== "undefined";
      const hasMaxPriorityFeePerGas =
        typeof transaction.maxPriorityFeePerGas !== "undefined";

      if (hasGasPrice && (hasMaxFeePerGas || hasMaxPriorityFeePerGas)) {
        throw new Error(
          "both gasPrice and (maxFeePerGas or maxPriorityFeePerGas) specified"
        );
      }
      // User specified 1559 gas fields (or none), use those
      let maxFeePerGas = 0n;
      let maxPriorityFeePerGas = 0n;
      if (hasMaxFeePerGas) {
        maxFeePerGas = BigInt(transaction.maxFeePerGas);
      }
      if (hasMaxPriorityFeePerGas) {
        maxPriorityFeePerGas = BigInt(transaction.maxPriorityFeePerGas);
      }
      if (maxPriorityFeePerGas > 0 || maxFeePerGas > 0) {
        const a = maxFeePerGas - baseFeePerGasBigInt;
        const tip = a < maxPriorityFeePerGas ? a : maxPriorityFeePerGas;
        gasPrice = Quantity.from(baseFeePerGasBigInt + tip);
      } else {
        gasPrice = Quantity.from(0);
      }
    }

    const block = new RuntimeBlock(
      parentHeader.number,
      parentHeader.parentHash,
      blockchain.coinbase,
      gas.toBuffer(),
      parentHeader.gasUsed.toBuffer(),
      parentHeader.timestamp,
      options.miner.difficulty,
      parentHeader.totalDifficulty,
      baseFeePerGasBigInt
    );

    const simulatedTransaction = {
      gas,
      // if we don't have a from address, our caller sut be the configured coinbase address
      from:
        transaction.from == null
          ? blockchain.coinbase
          : Address.from(transaction.from),
      to: transaction.to == null ? null : Address.from(transaction.to),
      gasPrice,
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
   * * `disableStorage`: \{boolean\} Setting this to `true` will disable storage capture (default = `false`).
   * * `disableMemory`: \{boolean\} Setting this to `true` will disable memory capture (default = `false`).
   * * `disableStack`: \{boolean\} Setting this to `true` will disable stack capture (default = `false`).
   *
   * @param transactionHash - Hash of the transaction to trace.
   * @param options - See options in source.
   * @returns Returns the `gas`, `structLogs`, and `returnValue` for the traced transaction.
   *
   * The `structLogs` are an array of logs, which contains the following fields:
   * * `depth`: The execution depth.
   * * `error`: Information about an error, if one occurred.
   * * `gas`: The number of gas remaining.
   * * `gasCost`: The cost of gas in wei.
   * * `memory`: An array containing the contract's memory data.
   * * `op`: The current opcode.
   * * `pc`: The current program counter.
   * * `stack`: The EVM execution stack.
   * * `storage`: An object containing the contract's storage data.
   *
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
    transactionHash: DATA,
    options?: Ethereum.TraceTransactionOptions
  ): Promise<Ethereum.TraceTransactionResult<"private">> {
    return this.#blockchain.traceTransaction(transactionHash, options || {});
  }

  // TODO: example doesn't return correct value
  /**
   * Attempts to replay the transaction as it was executed on the network and
   * return storage data given a starting key and max number of entries to return.
   *
   * @param blockHash - Hash of a block.
   * @param transactionIndex - Integer of the transaction index position.
   * @param contractAddress - Address of the contract.
   * @param startKey - Hash of the start key for grabbing storage entries.
   * @param maxResult - Integer of maximum number of storage entries to return.
   * @returns Returns a storage object with the keys being keccak-256 hashes of the storage keys,
   * and the values being the raw, unhashed key and value for that specific storage slot. Also
   * returns a next key which is the keccak-256 hash of the next key in storage for continuous downloading.
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
   * const initialTxHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", data: simpleSol }] });
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   *
   * const {contractAddress} = await provider.request({ method: "eth_getTransactionReceipt", params: [initialTxHash] });
   *
   * // set value to 19
   * const data = "0x552410770000000000000000000000000000000000000000000000000000000000000019";
   * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to: contractAddress, data }] });
   * await provider.once("message"); // Note: `await provider.once` is non-standard
   *
   * const { blockHash, transactionIndex } = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
   * const storage = await provider.request({ method: "debug_storageRangeAt", params: [blockHash, transactionIndex, contractAddress, "0x01", 1] });
   * console.log(storage);
   * ```
   */
  async debug_storageRangeAt(
    blockHash: DATA,
    transactionIndex: number,
    contractAddress: DATA,
    startKey: DATA,
    maxResult: number
  ): Promise<Ethereum.StorageRangeAtResult<"private">> {
    return this.#blockchain.storageRangeAt(
      blockHash,
      Quantity.toNumber(transactionIndex),
      contractAddress,
      startKey,
      Quantity.toNumber(maxResult)
    );
  }

  //#endregion

  //#region personal
  /**
   * Returns all the Ethereum account addresses of all keys that have been
   * added.
   * @returns The Ethereum account addresses of all keys that have been added.
   * @example
   * ```javascript
   * console.log(await provider.send("personal_listAccounts"));
   * ```
   */
  @assertArgLength(0)
  async personal_listAccounts(): Promise<string[]> {
    return this.#wallet.addresses;
  }

  // TODO: example doesn't return correct value
  /**
   * Generates a new account with private key. Returns the address of the new
   * account.
   * @param passphrase - The passphrase to encrypt the private key with.
   * @returns The new account's address.
   * @example
   * ```javascript
   * const passphrase = "passphrase";
   * const address = await provider.send("personal_newAccount", [passphrase] );
   * console.log(address);
   * ```
   */
  @assertArgLength(1)
  async personal_newAccount(passphrase: string): Promise<Address> {
    if (typeof passphrase !== "string") {
      throw new Error("missing value for required argument `passphrase`");
    }

    const wallet = this.#wallet;
    const newAccount = wallet.createRandomAccount();
    const address = newAccount.address;
    const strAddress = address.toString();
    await wallet.addToKeyFile(address, newAccount.privateKey, passphrase, true);
    wallet.addresses.push(strAddress);
    wallet.knownAccounts.add(strAddress);
    return newAccount.address;
  }

  /**
   * Imports the given unencrypted private key (hex string) into the key store, encrypting it with the passphrase.
   *
   * @param rawKey - The raw, unencrypted private key to import.
   * @param passphrase - The passphrase to encrypt with.
   * @returns Returns the address of the new account.
   * @example
   * ```javascript
   * const rawKey = "0x0123456789012345678901234567890123456789012345678901234567890123";
   * const passphrase = "passphrase";
   *
   * const address = await provider.send("personal_importRawKey",[rawKey, passphrase] );
   * console.log(address);
   * ```
   */
  @assertArgLength(2)
  async personal_importRawKey(
    rawKey: DATA,
    passphrase: string
  ): Promise<Address> {
    if (typeof passphrase !== "string") {
      throw new Error("missing value for required argument `passphrase`");
    }

    const wallet = this.#wallet;
    const newAccount = Wallet.createAccountFromPrivateKey(Data.from(rawKey));
    const address = newAccount.address;
    const strAddress = address.toString();
    await wallet.addToKeyFile(address, newAccount.privateKey, passphrase, true);
    wallet.addresses.push(strAddress);
    wallet.knownAccounts.add(strAddress);
    return newAccount.address;
  }

  /**
   * Locks the account. The account can no longer be used to send transactions.
   * @param address - The account address to be locked.
   * @returns Returns `true` if the account was locked, otherwise `false`.
   * @example
   * ```javascript
   * const [account] = await provider.send("personal_listAccounts");
   * const isLocked = await provider.send("personal_lockAccount", [account] );
   * console.log(isLocked);
   * ```
   */
  @assertArgLength(1)
  async personal_lockAccount(address: DATA): Promise<boolean> {
    return this.#wallet.lockAccount(address.toLowerCase());
  }

  // TODO: example doesn't return correct value
  /**
   * Unlocks the account for use.
   *
   * The unencrypted key will be held in memory until the unlock duration
   * expires. The unlock duration defaults to 300 seconds. An explicit duration
   * of zero seconds unlocks the key until geth exits.
   *
   * The account can be used with `eth_sign` and `eth_sendTransaction` while it is
   * unlocked.
   * @param address - 20 Bytes - The address of the account to unlock.
   * @param passphrase - Passphrase to unlock the account.
   * @param duration - (default: 300) Duration in seconds how long the account
   * should remain unlocked for. Set to 0 to disable automatic locking.
   * @returns `true` if it worked. Throws an error or returns `false` if it did not.
   * @example
   * ```javascript
   * // generate an account
   * const passphrase = "passphrase";
   * const newAccount = await provider.send("personal_newAccount", [passphrase] );
   * const isUnlocked = await provider.send("personal_unlockAccount", [newAccount, passphrase] );
   * console.log(isUnlocked);
   * ```
   */
  @assertArgLength(2, 3)
  async personal_unlockAccount(
    address: DATA,
    passphrase: string,
    duration: number = 300
  ): Promise<boolean> {
    const addy = new Address(address);
    return this.#wallet.unlockAccount(addy, passphrase, duration);
  }

  /**
   * Validate the given passphrase and submit transaction.
   *
   * The transaction is the same argument as for `eth_sendTransaction` and
   * contains the from address. If the passphrase can be used to decrypt the
   * private key belonging to `tx.from` the transaction is verified, signed and
   * send onto the network. The account is not unlocked globally in the node
   * and cannot be used in other RPC calls.
   *
   * Transaction call object:
   * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
   * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
   * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
   * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
   * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
   * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
   *
   * @param txData - The transaction call object as seen in source.
   * @param passphrase - The passphrase to decrpyt the private key belonging to `tx.from`.
   * @returns The transaction hash or if unsuccessful an error.
   * @example
   * ```javascript
   * const passphrase = "passphrase";
   * const newAccount = await provider.send("personal_newAccount", [passphrase] );
   * const [to] = await provider.send("personal_listAccounts");
   *
   * // use account and passphrase to send the transaction
   * const txHash = await provider.send("personal_sendTransaction", [{ from: newAccount, to, gasLimit: "0x5b8d80" }, passphrase] );
   * console.log(txHash);
   * ```
   */
  @assertArgLength(2)
  async personal_sendTransaction(
    transaction: Ethereum.Transaction,
    passphrase: string
  ): Promise<Data> {
    const blockchain = this.#blockchain;
    const tx = TransactionFactory.fromRpc(
      transaction as Transaction,
      blockchain.common
    );
    const from = tx.from;
    if (from == null) {
      throw new Error("from not found; is required");
    }

    const wallet = this.#wallet;
    const secretKey = await wallet.getFromKeyFile(tx.from, passphrase);

    await autofillDefaultTransactionValues(
      tx,
      this.eth_estimateGas.bind(this),
      this.eth_maxPriorityFeePerGas,
      transaction,
      blockchain,
      this.#options
    );

    return blockchain.queueTransaction(tx, Data.from(secretKey));
  }

  /**
   * Validates the given passphrase and signs a transaction that can be
   * submitted to the network at a later time using `eth_sendRawTransaction`.
   *
   * The transaction is the same argument as for `eth_signTransaction` and
   * contains the from address. If the passphrase can be used to decrypt the
   * private key belonging to `tx.from` the transaction is verified and signed.
   * The account is not unlocked globally in the node and cannot be used in other RPC calls.
   *
   * Transaction call object:
   * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
   * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
   * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
   * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
   * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
   * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
   *
   * @param transaction - The transaction call object as seen in source.
   * @returns The raw, signed transaction.
   * @example
   * ```javascript
   * const [to] = await provider.request({ method: "eth_accounts", params: [] });
   * const passphrase = "passphrase";
   * const from = await provider.send("personal_newAccount", [passphrase] );
   * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
   * const signedTx = await provider.request({ method: "personal_signTransaction", params: [{ from, to }, passphrase] });
   * console.log(signedTx)
   * ```
   */
  @assertArgLength(2)
  async personal_signTransaction(
    transaction: Ethereum.Transaction,
    passphrase: string
  ): Promise<Data> {
    const blockchain = this.#blockchain;
    const tx = TransactionFactory.fromRpc(
      transaction as Transaction,
      blockchain.common
    );

    if (tx.from == null) {
      throw new Error("from not found; is required");
    }

    const wallet = this.#wallet;
    const secretKey = await wallet.getFromKeyFile(tx.from, passphrase);
    tx.signAndHash(secretKey);
    return Data.from(tx.serialized);
  }
  //#endregion

  //#region rpc
  /**
   * Returns object of RPC modules.
   * @returns RPC modules.
   * @example
   * ```javascript
   * console.log(await provider.send("rpc_modules"));
   * ```
   */
  @assertArgLength(0)
  async rpc_modules(): Promise<typeof RPC_MODULES> {
    return RPC_MODULES;
  }
  //#endregion

  //#region shh

  /**
   * Creates new whisper identity in the client.
   *
   * @returns - The address of the new identity.
   * @example
   * ```javascript
   * console.log(await provider.send("shh_newIdentity"));
   * ```
   */
  @assertArgLength(0)
  async shh_newIdentity(): Promise<string> {
    return "0x00";
  }

  /**
   * Checks if the client hold the private keys for a given identity.
   *
   * @param address - The identity address to check.
   * @returns Returns `true` if the client holds the private key for that identity, otherwise `false`.
   * @example
   * ```javascript
   * console.log(await provider.send("shh_hasIdentity", ["0x0"] ));
   * ```
   */
  @assertArgLength(1)
  async shh_hasIdentity(address: DATA): Promise<boolean> {
    return false;
  }

  /**
   * Creates a new group.
   *
   * @returns The address of the new group.
   */
  @assertArgLength(0)
  async shh_newGroup(): Promise<string> {
    return "0x00";
  }

  /**
   * Adds a whisper identity to the group.
   *
   * @param address - The identity address to add to a group.
   * @returns `true` if the identity was successfully added to the group, otherwise `false`.
   * @example
   * ```javascript
   * console.log(await provider.send("shh_addToGroup", ["0x0"] ));
   * ```
   */
  @assertArgLength(1)
  async shh_addToGroup(address: DATA): Promise<boolean> {
    return false;
  }

  /**
   * Creates filter to notify, when client receives whisper message matching the filter options.
   *
   * @param to - (optional) Identity of the receiver. When present it will try to decrypt any incoming message
   *  if the client holds the private key to this identity.
   * @param topics - Array of topics which the incoming message's topics should match.
   * @returns Returns `true` if the identity was successfully added to the group, otherwise `false`.
   * @example
   * ```javascript
   * console.log(await provider.send("shh_newFilter", ["0x0", []] ));
   * ```
   */
  @assertArgLength(2)
  async shh_newFilter(to: DATA, topics: DATA[]): Promise<boolean> {
    return false;
  }

  /**
   * Uninstalls a filter with given id. Should always be called when watch is no longer needed.
   * Additionally filters timeout when they aren't requested with `shh_getFilterChanges` for a period of time.
   *
   * @param id - The filter id. Ex: "0x7"
   * @returns `true` if the filter was successfully uninstalled, otherwise `false`.
   * @example
   * ```javascript
   * console.log(await provider.send("shh_uninstallFilter", ["0x0"] ));
   * ```
   */
  @assertArgLength(1)
  async shh_uninstallFilter(id: QUANTITY): Promise<boolean> {
    return false;
  }

  /**
   * Polling method for whisper filters. Returns new messages since the last call of this method.
   *
   * @param id - The filter id. Ex: "0x7"
   * @returns More Info: https://github.com/ethereum/wiki/wiki/JSON-RPC#shh_getfilterchanges
   * @example
   * ```javascript
   * console.log(await provider.send("shh_getFilterChanges", ["0x0"] ));
   * ```
   */
  @assertArgLength(1)
  async shh_getFilterChanges(id: QUANTITY): Promise<[]> {
    return [];
  }

  /**
   * Get all messages matching a filter. Unlike shh_getFilterChanges this returns all messages.
   *
   * @param id - The filter id. Ex: "0x7"
   * @returns See: `shh_getFilterChanges`.
   * @example
   * ```javascript
   * console.log(await provider.send("shh_getMessages", ["0x0"] ));
   * ```
   */
  @assertArgLength(1)
  async shh_getMessages(id: QUANTITY): Promise<boolean> {
    return false;
  }

  /**
   * Creates a whisper message and injects it into the network for distribution.
   *
   * @param postData -
   * @returns Returns `true` if the message was sent, otherwise `false`.
   * @example
   * ```javascript
   * console.log(await provider.send("shh_post", [{}] ));
   * ```
   */
  @assertArgLength(1)
  async shh_post(postData: Ethereum.WhisperPostObject): Promise<boolean> {
    return false;
  }

  /**
   * Returns the current whisper protocol version.
   *
   * @returns The current whisper protocol version.
   * @example
   * ```javascript
   * console.log(await provider.send("shh_version"));
   * ```
   */
  @assertArgLength(0)
  async shh_version(): Promise<string> {
    return "2";
  }
  //#endregion

  //#region txpool

  /**
   * Returns the current content of the transaction pool.
   *
   * @returns The transactions currently pending or queued in the transaction pool.
   * @example
   * ```javascript
   * const [from] = await provider.request({ method: "eth_accounts", params: [] });
   * const pendingTx = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", nonce:"0x0" }] });
   * const queuedTx = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", nonce:"0x2" }] });
   * const pool = await provider.send("txpool_content");
   * console.log(pool);
   * ```
   */
  @assertArgLength(0)
  async txpool_content(): Promise<Ethereum.Pool.Content<"private">> {
    const { transactions, common } = this.#blockchain;
    const {
      transactionPool: { executables, origins }
    } = transactions;

    const processMap = (map: Map<string, Heap<TypedTransaction>>) => {
      let res: Record<
        string,
        Record<string, Ethereum.Pool.Transaction<"private">>
      > = {};
      for (let [_, { array, length }] of map) {
        for (let i = 0; i < length; ++i) {
          const transaction = array[i];
          const from = transaction.from.toString();
          if (res[from] === undefined) {
            res[from] = {};
          }
          // The nonce keys are actual decimal numbers (as strings) and not
          // hex literals (based on what geth returns).
          const nonce = transaction.nonce.toBigInt().toString();
          res[from][nonce] = transaction.toJSON(
            common
          ) as Ethereum.Pool.Transaction<"private">;
        }
      }
      return res;
    };

    return {
      pending: processMap(executables.pending),
      queued: processMap(origins)
    };
  }

  //#endregion
}
