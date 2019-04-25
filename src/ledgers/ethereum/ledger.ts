//#region Imports
import ILedger from "../../interfaces/ledger";
import EthereumOptions, { getDefaultOptions } from "./options";
import { JsonRpcData, JsonRpcQuantity, IndexableJsonRpcData } from "../../types/json-rpc";
import Blockchain from "./blockchain";
import Tag from "../../types/tags";
import Address, { IndexableAddress } from "../../types/address";
import Transaction from "../../types/transaction";
import Account from "../../types/account";
import JsonRpc from "../../servers/utils/jsonrpc";
const createKeccakHash = require("keccak");
// Read in the current ganache version from the package.json
const {name, version} = require("../../../package.json");
//#endregion

//#region Constants
const CLIENT_VERSION = `EthereumJS ${name}/v${version}/ethereum-js`
const PROTOCOL_VERSION = JsonRpcData.from("0x3f");
const BUFFER_ZERO = Buffer.from([0]);
const RPCQUANTITY_ZERO = JsonRpcQuantity.from("0x0");
//#endregion

const hash = createKeccakHash("keccak256");

const _accounts = Symbol("accounts");
const _options = Symbol("options");
const _coinbase = Symbol("coinbase");
const _isMining = Symbol("isMining");
const _blockchain = Symbol("blockchain");
const _knownAccounts = Symbol("knownAccounts");
const _unlockedAccounts = Symbol("unlockedAccounts");

export default class Ethereum implements ILedger {
  private readonly [_accounts]: Address[];
  private readonly [_knownAccounts] = new Map<string, JsonRpcData>();
  private readonly [_unlockedAccounts] = new Set<string>();
  private readonly [_options]: EthereumOptions;
  private readonly [_coinbase]: Account;
  private readonly [_blockchain]: Blockchain;
  private [_isMining] = false;

  /**
   * This is the Ethereum ledger that the provider interacts with.
   * The only methods permitted on the prototype are the supported json-rpc
   * methods.
   * @param options
   * @param ready Callback for when the ledger is fully initialized
   */
  constructor(options: EthereumOptions, ready: () => {}) {
    const opts = this[_options] = Object.assign(getDefaultOptions(), options);
    const accounts = opts.accounts;
    const knownAccounts = this[_knownAccounts];
    const unlockedAccounts = this[_unlockedAccounts];

    //#region Configure Known and Unlocked Accounts
    this[_coinbase] = accounts[0];
    const l = accounts.length;
    const accountsCache = this[_accounts] = Array(l);
    for (let i = 0; i < l; i++) {
      const account = accounts[i];
      const address = account.address;
      const strAddress = address.toString().toLowerCase();
      accountsCache[i] = address;
      knownAccounts.set(strAddress, account.privateKey);

      // if the `secure` option has been set do NOT add these accounts to the
      // _unlockedAccounts
      if (opts.secure) continue;

      unlockedAccounts.add(strAddress);
    }
    //#endregion

    //#region Unlocked Accounts
    const givenUnlockedUaccounts = opts.unlocked_accounts;
    if (givenUnlockedUaccounts) {
      const ul = givenUnlockedUaccounts.length;
      for (let i = 0; i < ul; i++) {
        let arg = givenUnlockedUaccounts[i];
        let address;
        switch (typeof arg) {
          case "string":
            // `toLowerCase` so we handle uppercase `0X` formats
            const addressOrIndex = arg.toLowerCase();
            if (addressOrIndex.indexOf("0x") === 0) {
              address = addressOrIndex;
              break;
            } else {
              // try to convert the arg string to a number.
              // don't use parseInt because strings like `"123abc"` parse
              // to `123`, and there is probably an error on the user's side we'd
              // want to uncover.
              const index = (arg as any) / 1;
              // if we don't have a valid number, or the number isn't an valid JS 
              // integer (no bigints or decimals, please), throw an error.
              if (!Number.isSafeInteger(index)) {
                throw new Error(`Invalid value in unlocked_accounts: ${arg}`);
              }
              arg = index;
              // not `break`ing here because I want this to fall through to the
              //  `"number"` case below.
              // Refactor it if you want.
              // break; // no break, please.
            }
          case "number":
            const account = accounts[arg];
            if (account == null) {
              throw new Error(
                `Account at index ${addressOrIndex} not found. Max index available
                is ${l - 1}.`
              );
            }
            address = account.address.toString().toLowerCase();
            break;
          default:
            throw new Error(
              `Invalid value specified in unlocked_accounts`
            );
        }
        unlockedAccounts.add(address);
      }
    }
    //#endregion

    const chain = this[_blockchain] = new Blockchain(options);
    chain.on("ready", ready);
  }

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
  async web3_sha3(string: string): Promise<JsonRpcData> {
    return JsonRpcData.from(hash(string).digest());
  };

  /**
   * Returns the current network id.
   * @returns {string} The current network id. This value should NOT be JSON-RPC
   * Quantity/Data encoded.
   */
  async net_version(): Promise<string> {
    return this[_options].net_version.toString();
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
  async net_peerCount(): Promise<JsonRpcQuantity> {
    return RPCQUANTITY_ZERO;
  }

  /**
   * Returns the current ethereum protocol version.
   * @returns The current ethereum protocol version.
   */
  async eth_protocolVersion(): Promise<JsonRpcData> {
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
    return this[_coinbase] ? this[_coinbase].address : null;
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
  async eth_hashrate(): Promise<JsonRpcQuantity> {
    return RPCQUANTITY_ZERO;
  }

  /**
   * Returns the current price per gas in wei.
   * @returns integer of the current gas price in wei.
   */
  async eth_gasPrice(): Promise<JsonRpcQuantity> {
    return this[_options].gasPrice;
  }

  /**
   * Returns a list of addresses owned by client.
   * @returns Array of 20 Bytes - addresses owned by the client.
   */
  async eth_accounts(): Promise<Address[]> {
    return this[_accounts];
  }

  /**
   * Returns the number of most recent block.
   * @returns integer of the current block number the client is on.
   */
  async eth_blockNumber(): Promise<bigint> {
    const latest = this[_blockchain].blocks.get(Tag.LATEST);
    return latest.then((block: any) => BigInt(block.value.header.number));
  }

  /**
   * Returns the balance of the account of given address.
   * @param address 20 Bytes - address to check for balance.
   * @param blockNumber integer block number, or the string "latest", "earliest"
   *  or "pending", see the default block parameter
   */
  async eth_getBalance(
      address: IndexableAddress,
      blockNumber: bigint | Tag = Tag.LATEST
    ): Promise<JsonRpcQuantity> {
    const chain = this[_blockchain];
    const str = blockNumber.toString();
    const block = await chain.blocks.get(Buffer.from([0]));
    //const block = await chain.blocks.get(str);
    const account = await chain.accounts.get(Address.from(address));
    //const account = await block.accounts.get(address);
    //return account.balance;
    return account.balance;
  }

  /**
   * Returns the information about a transaction requested by transaction hash.
   * 
   * @param transasctionHash 32 Bytes - hash of a transaction
   */
  async eth_getTransactionByHash(transasctionHash: IndexableJsonRpcData): Promise<Transaction> {
    transasctionHash = JsonRpcData.from(transasctionHash);

    const chain = this[_blockchain];
    const transaction = await chain.transactions.get(transasctionHash);
    return transaction;
  }

  async eth_sendTransaction(transaction: any): Promise<JsonRpcData> {
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

    const isKnownAccount = this[_knownAccounts].has(fromString);
    const isUnlockedAccount = this[_unlockedAccounts].has(fromString);

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
        const account = await this[_blockchain].accounts.get(from);
        tx.nonce = JsonRpcQuantity.from(1n + account.nonce.toBigInt()).toBuffer();
      }
      const secretKey = this[_knownAccounts].get(fromString);
      tx.sign(secretKey.toBuffer());
    }

    return this[_blockchain].queueTransaction(tx);
  }

  async eth_sendRawTransaction(transaction: any): Promise<JsonRpcData> {
    await this[_blockchain].queueTransaction(transaction);
    return transaction.hash;
  }

  readonly [index: string]: (...args: any) => Promise<{}>;
}
