import { Quantity } from "@ganache/utils";
import { LevelUp } from "levelup";
import { SecureTrie } from "merkle-patricia-tree";
import Blockchain from "../blockchain";

export class GanacheTrie extends SecureTrie {
  public readonly blockchain: Blockchain;

  constructor(db: LevelUp | null, root: Buffer, blockchain: Blockchain) {
    super(db, root);
    this.blockchain = blockchain;
  }

  setContext(stateRoot: Buffer, address: Buffer, blockNumber: Quantity) {
    this.root = stateRoot;
  }

  /**
   * Returns a copy of the underlying trie with the interface of GanacheTrie.
   * @param includeCheckpoints - If true and during a checkpoint, the copy will contain the checkpointing metadata and will use the same scratch as underlying db.
   */
  copy(includeCheckpoints = true) {
    const db = this.db.copy();
    const secureTrie = new GanacheTrie(db._leveldb as LevelUp, this.root, this.blockchain);
    if (includeCheckpoints && this.isCheckpoint) {
      secureTrie.db.checkpoints = [...this.db.checkpoints];
    }
    return secureTrie;
  }
}
