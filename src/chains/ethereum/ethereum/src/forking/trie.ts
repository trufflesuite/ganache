import { Address } from "@ganache/ethereum-address";
import { LevelUp } from "levelup";
import Blockchain from "../blockchain";
import AccountManager from "../data-managers/account-manager";
import { GanacheTrie } from "../helpers/trie";

export class ForkTrie extends GanacheTrie {
  private accounts: AccountManager;
  private address: Buffer | null = null;
  constructor(db: LevelUp | null, root: Buffer, blockchain: Blockchain) {
    super(db, root, blockchain);

    this.accounts = blockchain.accounts;
  }

  set root(value: Buffer) {
    this.address = null;
    (this as any)._root = value;
  }

  get root() {
    return (this as any)._root;
  }

  setContext(stateRoot: Buffer, address: Buffer) {
    (this as any)._root = stateRoot;
    this.address = address;
  }

  async get(key: Buffer): Promise<Buffer> {
    const value = await super.get(key);
    if (value != null) {
      return value;
    }

    const blockNumber = this.blockchain.fallback.blockNumber.toBuffer();
    if (this.address === null) {
      // otherwise we just want the account itself:
      const value = await this.accounts.getRaw(Address.from(key), blockNumber);
      return value;
    } else {
      // if the Trie is at an address, then we are looking for its storage:
      const address = Address.from(this.address);
      const value = await this.accounts.getStorageAt(address, key, blockNumber);
      return value;
    }
  }
  async put(key: Buffer, value: Buffer) {
    try {
      return super.put(key, value);
    } catch (e) {
      throw e;
    }
  }

  /**
   * Returns a copy of the underlying trie with the interface of ForkTrie.
   * @param includeCheckpoints - If true and during a checkpoint, the copy will contain the checkpointing metadata and will use the same scratch as underlying db.
   */
  copy(includeCheckpoints = true) {
    const db = this.db.copy();
    const secureTrie = new ForkTrie(db._leveldb, this.root, this.blockchain);
    if (includeCheckpoints && this.isCheckpoint) {
      secureTrie.db.checkpoints = [...this.db.checkpoints];
    }
    secureTrie.accounts = this.accounts;
    secureTrie.address = this.address;
    return secureTrie;
  }
}
