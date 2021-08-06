import { Address } from "@ganache/ethereum-address";
import {
  keccak,
  BUFFER_EMPTY,
  BUFFER_ZERO,
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

const MetadataSingletons = new WeakMap();
const LEVELDOWN_OPTIONS = {
  keyEncoding: "binary",
  valueEncoding: "binary"
};
/**
 * Commits a checkpoint to disk, if current checkpoint is not nested.
 * If nested, only sets the parent checkpoint as current checkpoint.
 * @throws If not during a checkpoint phase
 */
async function commit(this: CheckpointDB) {
  const { keyValueMap } = this.checkpoints.pop();
  if (!this.isCheckpoint) {
    // This was the final checkpoint, we should now commit and flush everything to disk
    const batchOp = [];
    keyValueMap.forEach(function (value, key) {
      if (value === null) {
        batchOp.push({
          type: "del",
          key: Buffer.from(key, "binary")
        });
      } else {
        batchOp.push({
          type: "put",
          key: Buffer.from(key, "binary"),
          value
        });
      }
    });
    await this.batch(batchOp);
  } else {
    // dump everything into the current (higher level) cache
    const currentKeyValueMap = this.checkpoints[this.checkpoints.length - 1]
      .keyValueMap;
    keyValueMap.forEach((value, key) => currentKeyValueMap.set(key, value));
  }
}

export class ForkTrie extends GanacheTrie {
  private accounts: AccountManager;
  private address: Buffer | null = null;
  public blockNumber: Quantity | null = null;
  private metadata: LevelUp;

  constructor(db: LevelUp | null, root: Buffer, blockchain: Blockchain) {
    super(db, root, blockchain);
    this.db.commit = commit.bind(this.db);

    this.accounts = blockchain.accounts;
    this.blockNumber = this.blockchain.fallback.blockNumber;

    if (MetadataSingletons.has(db)) {
      this.metadata = MetadataSingletons.get(db);
    } else {
      this.metadata = sub(db, "f", LEVELDOWN_OPTIONS);
      MetadataSingletons.set(db, this.metadata);
    }
  }

  set root(value: Buffer) {
    (this as any)._root = value;
  }

  get root() {
    return (this as any)._root;
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

  private async keyWasDeleted(key: Buffer) {
    return new Promise((resolve, reject) => {
      const selfAddress = this.address === null ? BUFFER_EMPTY : this.address;
      let wasDeleted = false;
      const stream = this.metadata
        .createKeyStream({
          lte: this.createDelKey(key),
          reverse: true
        })
        .on("data", data => {
          const delKey = lexico.decode(data);
          // const blockNumber = delKey[0];
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
    const metaDataPutPromise = this.metadata.put(delKey, BUFFER_ZERO);

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
