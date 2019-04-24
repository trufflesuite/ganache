import ILedger from "../../interfaces/ledger";
import EthereumOptions, { getDefaultOptions as getDefaultEthereumOptions } from "./options";
import { JsonRpcData, JsonRpcQuantity, IndexableJsonRpcData } from "../../types/json-rpc";
import Blockchain from "./blockchain";
import Tag from "../../types/tags";
import Address, { IndexableAddress } from "../../types/address";
import Transaction from "../../types/transaction";
import Account from "../../types/account";

const BUFFER_ZERO = Buffer.from([0]);
const createKeccakHash = require("keccak");

const hash = createKeccakHash("keccak256");

const _options = Symbol("options");
const _coinbase = Symbol("coinbase");
const _isMining = Symbol("isMining");
const _blockchain = Symbol("blockchain");
const _knownAccounts = Symbol("knownAccounts");
const _unlockedAccounts = Symbol("unlockedAccounts");


export default class Ethereum implements ILedger {
  private readonly [_knownAccounts] = new Set<string>();
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
    const opts = this[_options]
      = Object.assign(getDefaultEthereumOptions(), options);
    this[_coinbase] = opts.accounts[0];
    opts.accounts.forEach((account) => {
      const address = account.address.toString().toLowerCase();
      this[_knownAccounts].add(address);

      // if the `secure` option has been set do NOT add these accounts to the
      // _unlockedAccounts
      if (opts.secure) return;

      this[_unlockedAccounts].add(address);
    });
    opts.unlockedAccounts.forEach((addressOrIndex: string | number) => {
      let address;
      switch (typeof addressOrIndex) {
        case "string":
          if (addressOrIndex.indexOf("0x") === 0) {
            address = addressOrIndex;
            break;
          } else {
            addressOrIndex = parseInt(addressOrIndex as string, 10);
            // not `break`ing here because I want this to fall
            //  through to the `number` case.
            // Refactor it if you want.
            // break; // no break, please
          }
        case "number":
          const account = opts.accounts[addressOrIndex];
          if (!account) {
            throw new Error(
              `Account at index ${addressOrIndex} not found. Max 
                            index available is
                            ${opts.accounts.length - 1}.`
            );
          }
          address = account.address.toString();
          break;
        default:
          throw new Error(
            `Invalid value specified in unlocked_accounts`
          );
      }
      this[_knownAccounts].add(address.toLowerCase());
    });

    const chain = this[_blockchain] = new Blockchain(
      opts.db,
      opts.dbPath,
      opts.accounts,
      opts.hardfork,
      opts.allowUnlimitedContractSize,
      opts.gasLimit,
      opts.timestamp
    );
    chain.on("ready", ready);
  }

  /**
   * Returns the current client version.
   * @returns The current client version.
   */
  async web3_clientVersion(): Promise<string> {
    return "EthereumJS canache-core/v" + 0 + "/ethereum-js";
  };

  /**
   * Returns Keccak-256 (not the standardized SHA3-256) of the given data.
   * @param {string} the data to convert into a SHA3 hash.
   * @returns The SHA3 result of the given string.
   */
  async web3_sha3(string: string): Promise<Buffer> {
    return hash(string).digest();
  };

  /**
   * Returns number of peers currently connected to the client.
   * @returns {QUANTITY} integer of the number of connected peers.
   */
  async net_peerCount(): Promise<bigint> {
    return 0n;
  }

  /**
   * Returns the current network id.
   * @returns The current network id.
   */
  async net_version(): Promise<string> {
    return this[_options].net_version;
  }

  /**
   * Returns true if client is actively listening for network connections.
   * @returns true when listening, otherwise false.
   */
  async net_listening(): Promise<boolean> {
    return true;
  }

  /**
   * Returns the current ethereum protocol version.
   * @returns The current ethereum protocol version.
   */
  async eth_protocolVersion(): Promise<string> {
    return "63";
  }


  /**
   * Returns an object with data about the sync status or false.
   * @returns An object with sync status data or false, when not syncing:
   *   startingBlock: {bigint} - The block at which the import started (will only be reset, after the sync reached his head)
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
  async eth_coinbase(): Promise<JsonRpcData> {
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
  async eth_hashrate(): Promise<bigint> {
    return 0n;
  }

  /**
   * Returns the current price per gas in wei.
   * @returns integer of the current gas price in wei.
   */
  async eth_gasPrice(): Promise<bigint> {
    return this[_options].gasPrice;
  }

  /**
   * Returns a list of addresses owned by client.
   * @returns Array of 20 Bytes - addresses owned by the client.
   */
  async eth_accounts(): Promise<JsonRpcData[]> {
    return this[_options].accounts.map(account => account.address);
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
   * @param blockNumber integer block number, or the string "latest", "earliest" or "pending", see the default block parameter
   */
  async eth_getBalance(address: IndexableAddress, blockNumber: bigint | Tag = Tag.LATEST): Promise<JsonRpcQuantity> {
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
    // const block = await chain.blocks.get(Tag.LATEST);

    // // TODO: just POC stuff I was working on...
    // if (!block) {
    //     const b = new Block(null as any);
    //     b.header.number = Buffer.from("1234", "hex");
    //     const c = b.serialize(true);
    //     const d = new Block(c);
    //     // await chain.blocks.set(Tag.LATEST, c);
    // }
    // const block2 = await chain.blocks.get(Tag.LATEST);
    // // END


    const transaction = await chain.transactions.get(transasctionHash);
    return transaction;
  }

  async eth_sendTransaction(transaction: any): Promise<JsonRpcData> {
    const from = transaction.from ? JsonRpcData.from(transaction.from).toString().toLowerCase() : null;

    if (from == null) {
      throw new Error("from not found; is required");
    }

    // Error checks. It's possible to JSON.stringify a Buffer to JSON.
    // we actually now handle this "properly" (not sure about spec), but for
    // legacy reasons we don't allow it.
    if (transaction.to && typeof transaction.to !== "string") {
      throw new Error("Invalid to address");
    }

    const isKnownAccount = this[_knownAccounts].has(from);
    const isUnlockedAccount = this[_knownAccounts].has(from);

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
      tx.gasLimit = Buffer.from("15f90", "hex");
    }

    if (tx.gasPrice.length === 0) {
      tx.gasPrice = JsonRpcQuantity.from(this[_options].gasPrice).toBuffer();
    }

    if (tx.value.length === 0) {
      tx.value = Buffer.from([0]);
    }

    if (tx.to.length === 0 || tx.to.equals(BUFFER_ZERO)) {
      tx.to = Buffer.allocUnsafe(0);
    }

    return this[_blockchain].queueTransaction(tx);
  }

  async eth_sendRawTransaction(transaction: any): Promise<JsonRpcData> {
    await this[_blockchain].queueTransaction(transaction);
    return transaction.hash;
  }

  readonly [index: string]: (...args: any) => Promise<{}>;
}
