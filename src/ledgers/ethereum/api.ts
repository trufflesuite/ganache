//#region Imports
import Api, { Emitter } from "../../interfaces/api";
import EthereumOptions from "./options";
import {Data, Quantity} from "../../things/json-rpc";
import Blockchain from "./blockchain";
import Tag from "../../things/tags";
import Address, {IndexableAddress} from "../../things/address";
import Transaction from "../../things/transaction";
import {Block} from "./components/block-manager";
import Wallet from "./wallet";
import Account from "ethereumjs-account";
import {decode as rlpDecode} from "rlp";

const createKeccakHash = require("keccak");
// Read in the current ganache version from the package.json
import {name, version} from "../../../package.json";
//#endregion

//#region Constants
const BUFFER_EMPTY = Buffer.allocUnsafe(0);
const BUFFER_ZERO = Buffer.from([0]);
const CLIENT_VERSION = `EthereumJS ${name}/v${version}/ethereum-js`;
const PROTOCOL_VERSION = Data.from("0x3f");
const RPCQUANTITY_ZERO = Quantity.from("0x0");
//#endregion

// We use symbols for private properties because BaseLedger
// only allows index types of index type '(...args: any) => Promise<any>'
const _blockchain = Symbol("blockchain");
const _isMining = Symbol("isMining");
const _options = Symbol("options");
const _wallet = Symbol("wallet");

export default class EthereumApi implements Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  private readonly [_blockchain]: Blockchain;
  private [_isMining] = false;
  private readonly [_options]: EthereumOptions;
  private readonly [_wallet]: Wallet;

  /**
   * This is the Ethereum ledger that the provider interacts with.
   * The only methods permitted on the prototype are the supported json-rpc
   * methods.
   * @param options
   * @param ready Callback for when the ledger is fully initialized
   */
  constructor(options: EthereumOptions, emitter: Emitter) {
    const opts = (this[_options] = options);

    this[_wallet] = new Wallet(opts);

    const blockchain = (this[_blockchain] = new Blockchain(options));
    blockchain.on("start", () => emitter.emit("ready"));
    emitter.on("close", async () => await blockchain.stop());
  }

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
   * @param {string} the data to convert into a SHA3 hash.
   * @returns The SHA3 result of the given string.
   */
  async web3_sha3(string: string): Promise<Data> {
    return Data.from(createKeccakHash("keccak256").update(string).digest());
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
    return this[_wallet].coinbase.address;
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
  async eth_getBalance(address: IndexableAddress, blockNumber: Buffer | Tag = Tag.LATEST): Promise<Quantity> {
    const chain = this[_blockchain];
    const account = await chain.accounts.get(Address.from(address), blockNumber);
    return account.balance;
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
    position: bigint,
    blockNumber: Buffer | Tag = Tag.LATEST
  ): Promise<Data> {
    const blockProm = this[_blockchain].blocks.getRaw(blockNumber);

    const trie = this[_blockchain].trie.copy();
    const getFromTrie = (address: Buffer): Promise<Buffer> =>
      new Promise((resolve, reject) => {
        trie.get(address, (err, data) => {
          if (err) return reject(err);
          resolve(data);
        });
      });
    const block = await blockProm;
    if (!block) return Data.from("0x");

    const blockData = (rlpDecode(block) as any) as [
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
    let from;
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
      tx.gasPrice = this[_options].gasPrice.toBuffer();
    }

    if (tx.value.length === 0) {
      tx.value = Buffer.from([0]);
    }

    if (tx.to.length === 0 || tx.to.equals(BUFFER_ZERO)) {
      tx.to = BUFFER_EMPTY;
    }

    if (isKnownAccount) {
      if (tx.nonce.length === 0) {
        // TODO: check pending transactions and get the nonce from there
        const account = await this[_blockchain].accounts.get(from);
        tx.nonce = account.nonce.toBuffer();
      }
      const secretKey = this[_wallet].knownAccounts.get(fromString);
      tx.sign(secretKey.toBuffer());
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

  async eth_call(transaction: any, blockNumber: Buffer | Tag = Tag.LATEST): Promise<Data> {
    const blocks = this[_blockchain].blocks;
    const parentBlock = await blocks.get(blockNumber);
    const parentHeader = parentBlock.value.header;
    const newBlock = blocks.createBlock({
      number: parentHeader.number,
      timestamp: parentHeader.timestamp,
      parentHash: parentHeader.parentHash
    });
    return this[_blockchain].simulateTransaction(transaction, parentBlock, newBlock);
  }
}
