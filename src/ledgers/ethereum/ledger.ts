//#region Imports
import BaseLedger, {Emitter} from "../../interfaces/base-ledger";
import EthereumOptions from "./options";
import { Data, Quantity, IndexableData } from "../../types/json-rpc";
import Blockchain from "./blockchain";
import Tag from "../../types/tags";
import Address, { IndexableAddress } from "../../types/address";
import Transaction from "../../types/transaction";
import { Block } from "./components/block-manager";
import Wallet from "./wallet";
import Account from "ethereumjs-account";
import {decode as rlpDecode} from "rlp";

const createKeccakHash = require("keccak");
// Read in the current ganache version from the package.json
const {name, version} = require("../../../package.json");
//#endregion

//#region Constants
const CLIENT_VERSION = `EthereumJS ${name}/v${version}/ethereum-js`
const PROTOCOL_VERSION = Data.from("0x3f");
const BUFFER_ZERO = Buffer.from([0]);
const RPCQUANTITY_ZERO = Quantity.from("0x0");
//#endregion

const _options = Symbol("options");
const _wallet = Symbol("wallet");
const _isMining = Symbol("isMining");
const _blockchain = Symbol("blockchain");

export default class Ethereum extends BaseLedger {
  private readonly [_wallet]: Wallet;
  private readonly [_options]: EthereumOptions;
  private readonly [_blockchain]: Blockchain;
  private [_isMining] = false;

  /**
   * This is the Ethereum ledger that the provider interacts with.
   * The only methods permitted on the prototype are the supported json-rpc
   * methods.
   * @param options
   * @param ready Callback for when the ledger is fully initialized
   */
  constructor(options: EthereumOptions, emitter: Emitter) {
    super();

    const opts = this[_options] = options;

    this[_wallet] = new Wallet(opts);

    const blockchain = this[_blockchain] = new Blockchain(options);
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
  };

  /**
   * Returns Keccak-256 (not the standardized SHA3-256) of the given data.
   * @param {string} the data to convert into a SHA3 hash.
   * @returns The SHA3 result of the given string.
   */
  async web3_sha3(string: string): Promise<Data> {
    return Data.from(createKeccakHash("keccak256").update(string).digest());
  };
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
  async eth_getBalance(
      address: IndexableAddress,
      blockNumber: Buffer | Tag = Tag.LATEST
    ): Promise<Quantity> {
    const chain = this[_blockchain];
    const account = await chain.accounts.get(Address.from(address), blockNumber);
    return account.balance;
  }

  /**
   * Returns the information about a transaction requested by transaction hash.
   * 
   * @param transasctionHash 32 Bytes - hash of a transaction
   */
  async eth_getTransactionByHash(transasctionHash: IndexableData): Promise<Transaction> {
    transasctionHash = Data.from(transasctionHash);

    const chain = this[_blockchain];
    const transaction = await chain.transactions.get(transasctionHash);
    return transaction;
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
      tx.gasLimit = Buffer.from("015f90", "hex");
    }

    if (tx.gasPrice.length === 0) {
      tx.gasPrice = this[_options].gasPrice.toBuffer();
    }

    if (tx.value.length === 0) {
      tx.value = Buffer.from([0]);
    }

    if (tx.to.length === 0 || tx.to.equals(BUFFER_ZERO)) {
      tx.to = Buffer.allocUnsafe(0);
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
    const block = await blocks.get(blockNumber);
    const blockCopy = blocks.createBlock(block.value.header);
    const currentNumber = Quantity.from(blockCopy.value.header.number).toBigInt() || 0n;
    let parentBlock: Block;
    if (currentNumber > 0n) {
      const previousBlockNumber = Quantity.from(currentNumber - 1n);
      parentBlock = await blocks.get(previousBlockNumber.toBuffer());
    } else {
      parentBlock = blockCopy;
    }
    return this[_blockchain].simulateTransaction(transaction, parentBlock, blockCopy);
  }
}
