import { Address } from "@ganache/ethereum-address";
import {
  keccak,
  BUFFER_EMPTY,
  RPCQUANTITY_ONE,
  RPCQUANTITY_EMPTY,
  Quantity,
  Data
} from "@ganache/utils";
import type { LevelUp } from "levelup";
import Blockchain from "../blockchain";
import AccountManager from "../data-managers/account-manager";
import { GanacheTrie } from "../helpers/trie";
import sub from "subleveldown";
import { CheckpointDB } from "merkle-patricia-tree/dist/checkpointDb";
import * as lexico from "./lexicographic-key-codec";
import { encode } from "@ganache/rlp";
import { Account } from "@ganache/ethereum-utils";
import { KECCAK256_NULL } from "ethereumjs-util";

const GET_CODE = "eth_getCode";
const GET_NONCE = "eth_getTransactionCount";
const GET_BALANCE = "eth_getBalance";
const GET_STORAGE_AT = "eth_getStorageAt";

const MetadataSingletons = new WeakMap<LevelUp, CheckpointDB>();
const LEVELDOWN_OPTIONS = {
  keyEncoding: "binary",
  valueEncoding: "binary"
};

export class ForkTrie extends GanacheTrie {
  private accounts: AccountManager;
  private address: Buffer | null = null;
  public blockNumber: Quantity;
  private metadata: CheckpointDB;

  constructor(db: LevelUp | null, root: Buffer, blockchain: Blockchain) {
    super(db, root, blockchain);

    this.accounts = blockchain.accounts;
    this.blockNumber = this.blockchain.fallback.blockNumber;

    if (MetadataSingletons.has(db)) {
      this.metadata = MetadataSingletons.get(db);
    } else {
      this.metadata = new CheckpointDB(sub(db, "f", LEVELDOWN_OPTIONS));
      MetadataSingletons.set(db, this.metadata);
    }
  }

  set root(value: Buffer) {
    (this as any)._root = value;
  }

  get root() {
    return (this as any)._root;
  }

  checkpoint() {
    super.checkpoint();
    this.metadata.checkpoint(this.root);
  }
  async commit() {
    await Promise.all([super.commit(), this.metadata.commit()]);
  }
  async revert() {
    await Promise.all([super.revert(), this.metadata.revert()]);
  }

  setContext(stateRoot: Buffer, address: Buffer, blockNumber: Quantity) {
    (this as any)._root = stateRoot;
    this.address = address;
    this.blockNumber = blockNumber;
  }

  async put(key: Buffer, val: Buffer): Promise<void> {
    return super.put(key, val);
  }

  private createDelKey(key: Buffer) {
    const blockNum = this.blockNumber.toBuffer();
    return lexico.encode([blockNum, this.address, key]);
  }

  /**
   * Checks if the key was deleted (locally -- not on the fork)
   * @param key
   */
  private async keyWasDeleted(key: Buffer) {
    const selfAddress = this.address === null ? BUFFER_EMPTY : this.address;
    // check the uncommitted checkpoints for deleted keys before
    // checking the database itself
    // TODO(perf): there is probably a better/faster way of doing this for the
    // common case.
    const checkpoints = this.metadata.checkpoints;
    for (let i = checkpoints.length - 1; i >= 0; i--) {
      for (let [data, value] of checkpoints[i].keyValueMap.entries()) {
        if (!value || value[0] !== 1) {
          continue;
        }

        const delKey = lexico.decode(Buffer.from(data, "binary"));
        //const blockNumber = delKey[0];
        const address = delKey[1];
        const deletedKey = delKey[2];
        if (address.equals(selfAddress) && deletedKey.equals(key)) {
          return true;
        }
      }
    }

    return new Promise((resolve, reject) => {
      let wasDeleted = false;
      const stream = this.metadata._leveldb
        .createReadStream({
          lte: this.createDelKey(key),
          reverse: true
        })
        .on("data", data => {
          const { key, value } = data;
          if (!value || value[0] !== 1) {
            return;
          }
          const delKey = lexico.decode(key);
          //const blockNumber = delKey[0];
          const address = delKey[1];
          const deletedKey = delKey[2];
          if (address.equals(selfAddress) && deletedKey.equals(key)) {
            wasDeleted = true;
            (stream as any).destroy();
          }
        })
        .on("close", () => resolve(wasDeleted))
        .on("error", reject);
    });
  }

  async del(key: Buffer) {
    await this.lock.wait();

    const hash = keccak(key);
    const delKey = this.createDelKey(key);

    const metaDataPutPromise = this.metadata.put(
      delKey,
      RPCQUANTITY_ONE.toBuffer()
    );

    const { node, stack } = await this.findPath(hash);

    if (node) await this._deleteNode(hash, stack);
    await metaDataPutPromise;
    this.lock.signal();
  }

  /**
   * Gets an account from the fork/fallback.
   *
   * @param address the address of the account
   * @param blockNumber the block number at which to query the fork/fallback.
   * @param stateRoot the state root at the given blockNumber
   */
  private accountFromFallback = async (
    address: Address,
    blockNumber: Quantity
  ) => {
    const { fallback } = this.blockchain;

    const number = this.blockchain.fallback.selectValidForkBlockNumber(
      blockNumber
    );

    // get nonce, balance, and code from the fork/fallback
    const codeProm = fallback.request<string>(GET_CODE, [address, number]);
    const promises = [
      fallback.request<string>(GET_NONCE, [address, number]),
      fallback.request<string>(GET_BALANCE, [address, number]),
      null
    ] as [nonce: Promise<string>, balance: Promise<string>, put: Promise<void>];

    // create an account so we can serialize everything later
    const account = new Account(address);

    // because code requires additional asynchronous processing, we await and
    // process it ASAP
    try {
      const codeHex = await codeProm;
      if (codeHex !== "0x") {
        const code = Data.from(codeHex).toBuffer();
        // the codeHash is just the keccak hash of the code itself
        account.codeHash = keccak(code);
        if (!account.codeHash.equals(KECCAK256_NULL)) {
          // insert the code directly into the database with a key of `codeHash`
          promises[2] = this.db.put(account.codeHash, code);
        }
      }
    } catch (e) {
      // Since we fired off some promises that may throw themselves we need to
      // catch these errors and discard them.
      Promise.all(promises).catch(e => {});
      throw e;
    }

    // finally, set the `nonce` and `balance` on the account before returning
    // the serialized data
    const [nonce, balance] = await Promise.all(promises);
    account.nonce =
      nonce === "0x0" ? RPCQUANTITY_EMPTY : Quantity.from(nonce, true);
    account.balance =
      balance === "0x0" ? RPCQUANTITY_EMPTY : Quantity.from(balance);

    return account.serialize();
  };

  private storageFromFallback = async (
    address: Buffer,
    key: Buffer,
    blockNumber: Quantity
  ) => {
    const result = await this.blockchain.fallback.request<string>(
      GET_STORAGE_AT,
      [
        `0x${address.toString("hex")}`,
        `0x${key.toString("hex")}`,
        this.blockchain.fallback.selectValidForkBlockNumber(blockNumber)
      ]
    );
    if (!result) return null;

    // remove the `0x` and all leading 0 pairs:
    const compressed = result.replace(/^0x(00)*/, "");
    const buf = Buffer.from(compressed, "hex");
    return encode(buf);
  };

  async get(key: Buffer): Promise<Buffer> {
    const value = await super.get(key);
    if (value != null) {
      return value;
    }
    // since we don't have this key in our local trie check if we've have
    // deleted it (locally)
    if (await this.keyWasDeleted(key)) {
      return null;
    }

    if (this.address === null) {
      // if the trie context's address isn't set, our key represents an address:
      return this.accountFromFallback(Address.from(key), this.blockNumber);
    } else {
      // otherwise the key represents storage at the given address:
      return this.storageFromFallback(this.address, key, this.blockNumber);
    }
  }

  /**
   * Returns a copy of the underlying trie with the interface of ForkTrie.
   * @param includeCheckpoints - If true and during a checkpoint, the copy will contain the checkpointing metadata and will use the same scratch as underlying db.
   */
  copy() {
    const db = this.db.copy();
    const secureTrie = new ForkTrie(db._leveldb, this.root, this.blockchain);
    secureTrie.accounts = this.accounts;
    secureTrie.address = this.address;
    secureTrie.blockNumber = this.blockNumber;
    return secureTrie;
  }
}
