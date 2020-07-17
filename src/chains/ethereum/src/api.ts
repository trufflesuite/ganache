//#region Imports
import {types} from "@ganache/utils";
import {toRpcSig, KECCAK256_NULL, ecsign, hashPersonalMessage} from "ethereumjs-util";
import EthereumOptions from "./options";
import {Data, Quantity} from "@ganache/utils/src/things/json-rpc";
import Blockchain from "./blockchain";
import Tag from "./things/tags";
import Address, {IndexableAddress} from "./things/address";
import Transaction from "./things/transaction";
import Wallet from "./wallet";
import {decode as rlpDecode} from "rlp";

const createKeccakHash = require("keccak");
// Read in the current ganache version from core's package.json
import {name, version} from "../../../packages/core/package.json";
import PromiEvent from "@ganache/utils/src/things/promievent";
import Emittery from "emittery";
import Account from "./things/account";
//#endregion

//#region Constants
const BUFFER_EMPTY = Buffer.allocUnsafe(0);
const BUFFER_ZERO = Buffer.from([0]);
const CLIENT_VERSION = `EthereumJS${name}/v${version}/ethereum-js`;
const PROTOCOL_VERSION = Data.from("0x3f");
const RPCQUANTITY_ZERO = Quantity.from("0x0");
//#endregion

// We use symbols for private properties because types.Api
// only allows index types of index type '(...args: any) => Promise<any>'
const _blockchain = Symbol("blockchain");
const _isMining = Symbol("isMining");
const _options = Symbol("options");
const _wallet = Symbol("wallet");
const _filters = Symbol("filters");

//#region types
type SubscriptionId = string;
//#endregion

export default class EthereumApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  private readonly [_filters] = new Map<any, any>();
  private readonly [_blockchain]: Blockchain;
  private readonly [_options]: EthereumOptions;
  private readonly [_wallet]: Wallet;

  /**
   * This is the Ethereum ledger that the provider interacts with.
   * The only methods permitted on the prototype are the supported json-rpc
   * methods.
   * @param options
   * @param ready Callback for when the ledger is fully initialized
   */
  constructor(options: EthereumOptions, emitter: Emittery.Typed<undefined, "message" | "connect" | "disconnect">) {
    const opts = (this[_options] = options);

    this[_wallet] = new Wallet(opts);

    const blockchain = (this[_blockchain] = new Blockchain(options));
    blockchain.on("start", () => {
      emitter.emit("connect");
    });
    emitter.on("disconnect", () => {
      return blockchain.stop();
    });
  }

  //#region evm
  /**
   * Force a block to be mined.
   * 
   * Mines a block independent of whether or not mining is started or stopped.
   * 
   * @param timestamp? the timestamp a block should setup as the mining time.
   */
  async evm_mine(timestamp?: number) {
    await this[_blockchain].transactions.transactionPool.drain(0, timestamp);
    return Promise.resolve("0x0");
  }

  /**
   * Sets the given account's nonce to the specified value.
   * 
   * Warning: this may result in an invalid state.
   * 
   * @param address 
   * @param nonce
  */
  async evm_setAccountNonce(address: string, nonce: number | BigInt) {
    return new Promise((resolve, reject) => {
      const buffer = Address.from(address).toBuffer();
      this[_blockchain].vm.stateManager.getAccount(buffer, (err, account) => {
        if (err) {
          return void reject(err)
        }
        account.nonce = nonce;
        this[_blockchain].vm.stateManager.putAccount(buffer, account, (err) => {
          if (err) {
            return void reject(err)
          }
          resolve(null); 
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
    return this[_blockchain].increaseTime(seconds);
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
    return this[_blockchain].setTime(+time);
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
   * @example <caption>Basic example</caption>
   * const snapshotId = await provider.send("evm_snapshot");
   * const isReverted = await provider.send("evm_revert", [snapshotId]);
   *
   * @example <caption>Complete example</caption>
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
   */
  async evm_revert(snapshotId: string | number) {
    return this[_blockchain].revert(Quantity.from(snapshotId));
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
   * @example <caption>Basic example</caption>
   * const snapshotId = await provider.send("evm_snapshot");
   * 
   * @example <caption>Complete example</caption>
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
   */
  async evm_snapshot() {
    return Quantity.from(this[_blockchain].snapshot());
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
  miner_start(threads: number = 1) {
    this[_blockchain].resume(threads);
    return Promise.resolve(true);
  }

  /**
   * Stop the CPU mining operation.
   */
  async miner_stop() {
    this[_blockchain].pause();
    return Promise.resolve(true);
  }

  /**
   * 
   * @param number Sets the minimal accepted gas price when mining transactions.
   * Any transactions that are below this limit are excluded from the mining 
   * process.
   */
  async miner_setGasPrice(number: Quantity) {
    this[_options].gasPrice = number;
    return true;
  }

  /**
   * Sets the etherbase, where mining rewards will go.
   * @param address 
   */
  async miner_setEtherbase(address: Address) {
    this[_options].coinbase = new Account(address);
    return true;
  }
  //#endregion

  //#region web3
  /**
   * Returns the current client version.
   * @returns The current client version.
   */
  async web3_clientVersion(): Promise<string> {
    return CLIENT_VERSION;
  }

  /**
   * Returns Keccak-256 (not the standardized SHA3-256) of the given data.
   * @param {data} the data to convert into a SHA3 hash.
   * @returns The SHA3 result of the given string.
   */
  async web3_sha3(data: string): Promise<Data> {
    return Data.from(createKeccakHash("keccak256").update(data).digest());
  }
  //#endregion

  //#region net
  /**
   * Returns the current network id.
   * @returns {string} The current network id. This value should NOT be JSON-RPC
   * Quantity/Data encoded.
   */
  async net_version(): Promise<string> {
    return this[_options].networkId.toString();
  }

  /**
   * Returns true if client is actively listening for network connections.
   * @returns true when listening, otherwise false.
   */
  async net_listening(): Promise<boolean> {
    // TODO: this should return false when ganache isn't used with a server, or
    // or while the server is still initializing.
    return true;
  }

  /**
   * Returns number of peers currently connected to the client.
   * @returns {QUANTITY} integer of the number of connected peers.
   */
  async net_peerCount(): Promise<Quantity> {
    return RPCQUANTITY_ZERO;
  }
  //#endregion

  /**
   * Generates and returns an estimate of how much gas is necessary to allow the
   * transaction to complete. The transaction will not be added to the
   * blockchain. Note that the estimate may be significantly more than the
   * amount of gas actually used by the transaction, for a variety of reasons
   * including EVM mechanics and node performance.
   * 
   * @returns the amount of gas used.
   */
  async eth_estimateGas(): Promise<Quantity> {
    // TODO: do this for real
    return Quantity.from(6721975);
  }

  /**
   * Returns the current ethereum protocol version.
   * @returns The current ethereum protocol version.
   */
  async eth_protocolVersion(): Promise<Data> {
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
  async eth_syncing(): Promise<object | boolean> {
    return false;
  }

  /**
   * Returns the client coinbase address.
   * @returns 20 bytes - the current coinbase address.
   */
  async eth_coinbase(): Promise<Address> {
    return this[_options].coinbase.address;
  }

  /**
   * Returns information about a block by block number.
   * @param number QUANTITY|TAG - integer of a block number, or the string "earliest", "latest" or "pending", as in th e default block parameter.
   * @param transactions Boolean - If true it returns the full transaction objects, if false only the hashes of the transactions.
   * @returns Block
   */
  async eth_getBlockByNumber(number: string | Buffer, transactions = false) {
    const block = await this[_blockchain].blocks.get(number);
    return block.toJSON(transactions);
  }

  /**
   * Returns information about a block by block hash.
   * @param number QUANTITY|TAG - integer of a block number, or the string "earliest", "latest" or "pending", as in th e default block parameter.
   * @param transactions Boolean - If true it returns the full transaction objects, if false only the hashes of the transactions.
   * @returns Block
   */
  async eth_getBlockByHash(hash: string | Buffer, transactions = false) {
    const block = await this[_blockchain].blocks.getByHash(hash);
    return block.toJSON(transactions);
  }

  /**
   * Returns the number of transactions in a block from a block matching the given block number.
   * @param number QUANTITY|TAG - integer of a block number, or the string "earliest", "latest" or "pending", as in the default block parameter.
   */
  async eth_getBlockTransactionCountByNumber(number: string | Buffer) {
    const rawBlock = await this[_blockchain].blocks.getRaw(number);
    const data = rlpDecode(rawBlock);
    return (data[1] as any).length;
  }

  /**
   * Returns the number of transactions in a block from a block matching the given block hash.
   * @param hash DATA, 32 Bytes - hash of a block.
   */
  async eth_getBlockTransactionCountByHash(hash: string | Buffer) {
    const number = await this[_blockchain].blocks.getNumberFromHash(hash);
    return this.eth_getBlockTransactionCountByNumber(number);
  }

  /**
   * Returns information about a transaction by block hash and transaction index position.
   * @param hash DATA, 32 Bytes - hash of a block.
   * @param index QUANTITY - integer of the transaction index position.
   */
  async eth_getTransactionByBlockHashAndIndex(hash: string | Buffer, index: string) {
    const block = await this.eth_getBlockByHash(hash, true);
    return block.transactions[parseInt(index, 10)];
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
    const block = await this.eth_getBlockByHash(hash);
    return block.uncles.length.toString();
  }

  /**
   * Returns the number of uncles in a block from a block matching the given block hash.
   * @param hash DATA, 32 Bytes - hash of a block.
   */
  async eth_getUncleCountByBlockNumber(number: string | Buffer) {
    const block = await this.eth_getBlockByNumber(number);
    return block.uncles.length.toString();
  }

  /**
   * Returns true if client is actively mining new blocks.
   * @returns returns true of the client is mining, otherwise false.
   */
  async eth_mining(): Promise<boolean> {
    return this[_isMining];
  }

  /**
   * Returns the number of hashes per second that the node is mining with.
   * @returns number of hashes per second.
   */
  async eth_hashrate(): Promise<Quantity> {
    return RPCQUANTITY_ZERO;
  }

  /**
   * Returns the current price per gas in wei.
   * @returns integer of the current gas price in wei.
   */
  async eth_gasPrice(): Promise<Quantity> {
    return this[_options].gasPrice;
  }

  /**
   * Returns a list of addresses owned by client.
   * @returns Array of 20 Bytes - addresses owned by the client.
   */
  async eth_accounts(): Promise<Address[]> {
    return this[_wallet].accounts;
  }

  /**
   * Returns the number of most recent block.
   * @returns integer of the current block number the client is on.
   */
  async eth_blockNumber() {
    const latest = await this[_blockchain].blocks.get(Tag.LATEST);
    return Quantity.from(latest.value.header.number);
  }

  /**
   * Returns the currently configured chain id, a value used in
   * replay-protected transaction signing as introduced by EIP-155.
   * @returns The chain id as a string.
   */
  async eth_chainId(): Promise<string> {
    return this[_options].chainId.toString();
  }

  /**
   * Returns the balance of the account of given address.
   * @param address 20 Bytes - address to check for balance.
   * @param blockNumber integer block number, or the string "latest", "earliest"
   *  or "pending", see the default block parameter
   */
  async eth_getBalance(address: string | IndexableAddress, blockNumber: Buffer | Tag = Tag.LATEST): Promise<Quantity> {
    const chain = this[_blockchain];
    const account = await chain.accounts.get(Address.from(address), blockNumber);
    return account.balance;
  }

  async eth_getCode(address: Buffer | IndexableAddress, blockNumber: Buffer | Tag = Tag.LATEST) {
    const blockchain = this[_blockchain];
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
    if (!block) return Data.from("0x");

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
    address: IndexableAddress,
    position: bigint | number,
    blockNumber: string | Buffer | Tag = Tag.LATEST
  ): Promise<Data> {
    const blockProm = this[_blockchain].blocks.getRaw(blockNumber);

    const trie = this[_blockchain].trie.copy();
    const getFromTrie = (address: Buffer): Promise<Buffer> =>
      new Promise((resolve, reject) => {
        trie.get(address, (err, data) => {
          if (err) return void reject(err);
          resolve(data);
        });
      });
    const block = await blockProm;
    if (!block) return Data.from("0x");

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
    // if the provided `position` is > 32 bytes it's invalid.
    // TODO: should we ignore or just return an RPC exception of some sort?
    const length = posBuff.length;
    if (length > 32) return Data.from("0x");
    let paddedPosBuff: Buffer;
    if (length !== 32) {
      // storage locations are 32 byte wide Buffers, so we need to
      // expand any value given to at least 32 bytes
      paddedPosBuff = Buffer.alloc(32);
      posBuff.copy(paddedPosBuff, 32 - length);
    } else {
      paddedPosBuff = posBuff;
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
  async eth_getTransactionByHash(transactionHash: string): Promise<Transaction> {
    const chain = this[_blockchain];
    const transaction = await chain.transactions.get(Data.from(transactionHash).toBuffer());
    return transaction;
  }

  /**
   * Returns the receipt of a transaction by transaction hash.
   *
   * Note That the receipt is not available for pending transactions.
   *
   * @param transactionHash 32 Bytes - hash of a transaction
   * @returns Returns the receipt of a transaction by transaction hash.
   */
  async eth_getTransactionReceipt(transactionHash: string): Promise<{}> {
    const blockchain = this[_blockchain];
    const transactionPromise = blockchain.transactions.get(transactionHash);
    const receiptPromise = blockchain.transactionReceipts.get(transactionHash);
    const blockPromise = transactionPromise.then(t => (t ? blockchain.blocks.get(t._blockNum) : null));
    const [transaction, receipt, block] = await Promise.all([transactionPromise, receiptPromise, blockPromise]);
    if (receipt && block && transaction) {
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
  async eth_sendTransaction(transaction: any): Promise<Data> {
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
      throw new Error("Invalid to address");
    }

    const isKnownAccount = this[_wallet].knownAccounts.has(fromString);
    const isUnlockedAccount = this[_wallet].unlockedAccounts.has(fromString);

    if (!isUnlockedAccount) {
      const msg = isKnownAccount ? "signer account is locked" : "sender account not recognized";
      throw new Error(msg);
    }

    let type = Transaction.types.none;
    if (!isKnownAccount) {
      type |= Transaction.types.fake;
    }

    const tx = Transaction.fromJSON(transaction, type);
    if (tx.gasLimit.length === 0) {
      tx.gasLimit = this[_options].defaultTransactionGasLimit.toBuffer();
    }

    if (tx.gasPrice.length === 0) {
      const gasPrice = this[_options].gasPrice;
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

    if (isKnownAccount) {
      const secretKey = this[_wallet].knownAccounts.get(fromString);
      return this[_blockchain].queueTransaction(tx, secretKey);
    }

    return this[_blockchain].queueTransaction(tx);
  }

  /**
   * Creates new message call transaction or a contract creation for signed transactions.
   * @param transaction
   * @returns The transaction hash
   */
  async eth_sendRawTransaction(transaction: any): Promise<Data> {
    return await this[_blockchain].queueTransaction(transaction);
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
  eth_sign(account: string | Buffer, message: string | Buffer) {
    const address = Address.from(account).toString().toLowerCase();
    const wallet =this[_wallet];
    const isUnlocked = wallet.unlockedAccounts[address];
    let privateKey: Buffer;
    if (isUnlocked) {
      privateKey = wallet.knownAccounts.get[address];
    }
    if (!privateKey) {
      throw new Error("cannot sign data; no private key");  
    }

    const messageHash = hashPersonalMessage(Data.from(message).toBuffer());
    const signature = ecsign(messageHash, privateKey);
    return Promise.resolve(toRpcSig(signature.v, signature.r, signature.s, +this[_options].chainId));
  }

  eth_subscribe(subscriptionName: "newHeads", options?: any): PromiEvent<any> {
    switch (subscriptionName) {
      case "newHeads":
        const filters = this[_filters];
        const promiEvent = new PromiEvent(resolve => {
          const subscription = `0x${filters.size.toString(16)}`;
          const unsubscribe = this[_blockchain].on("block", (result: any) => {
            promiEvent.emit("message", {
              type: "eth_subscription",
              data: {
                result: result.value.header.toJSON(true),
                subscription
              }
            });
          });
          filters.set(subscription, unsubscribe);

          resolve(subscription);
        });
        return promiEvent;
      //case "logs":
        // const promiEvent = new PromiEvent(resolve => {
        //   this.eth_newFilter([paramsz[1]])
        //     .then(hexId => {
        //         resolve(hexId);
        //     });
        // });
        // promiEvent.then(hexId => {
        //   this[_filters]
        //     .get(hexId)
        //     .on("block")
        //     .then((block: any) => {
        //       const blockNumber = block.number;
        //       return [{
        //         fromBlock: blockNumber,
        //         toBlock: blockNumber
        //       }];
        //     }).then(this.eth_getLogs).then((logs: any) => {
        //       promiEvent.emit("result", logs);
        //     });
        // });
        // return promiEvent;
      // case 'newPendingTransactions':
      //   createSubscriptionFilter = self.newPendingTransactionFilter.bind(self)
      //   break
      // case 'newHeads':
      //   createSubscriptionFilter = self.newBlockFilter.bind(self)
      //   break
      // case 'syncing':
      // default:
      //   cb(new Error('unsupported subscription type'))
      //   return
    }
  }


  async eth_unsubscribe([subscriptionId]: [SubscriptionId]): Promise<any> {
    const filters = this[_filters];
    const unsubscribe = filters.get(subscriptionId);
    if (unsubscribe) {
      filters.delete(subscriptionId);
      unsubscribe();
      return true;
    } else {
      throw new Error(`Subscription ID ${subscriptionId} not found.`)
    }
  }

  async eth_newBlockFilter(): Promise<any>{

  }
  async eth_newPendingTransactionFilter(): Promise<any>{

  }
  async eth_newFilter(params: any[]): Promise<any> {
    
  }
  async eth_getFilterChanges(): Promise<any> {

  }
  async eth_uninstallFilter(): Promise<any> {

  }
  async eth_getFilterLogs(): Promise<any> {
  }

  async eth_getLogs(): Promise<any> {

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
    const account = await this[_blockchain].accounts.get(Address.from(address), blockNumber);
    return account.nonce;
  }

  async eth_call(transaction: any, blockNumber: Buffer | Tag | string = Tag.LATEST): Promise<Data> {
    const blocks = this[_blockchain].blocks;
    const parentBlock = await blocks.get(blockNumber);
    const parentHeader = parentBlock.value.header;
    const options = this[_options];
    
    if (!transaction.gasLimit) {
      if (!transaction.gas) {
        // eth_call isn't subject to regular transaction gas limits
        transaction.gas = options.callGasLimit.toString();
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
      coinbase: options.coinbase.address.toBuffer(),
      // gas estimates and eth_calls aren't subject to regular block gas limits
      gasLimit: transaction.gas
    });
    return this[_blockchain].simulateTransaction(transaction, parentBlock, newBlock);
  }
}
