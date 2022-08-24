import { Quantity } from "@ganache/utils";
import { LevelUp } from "levelup";
import { SecureTrie } from "merkle-patricia-tree";
import { CheckpointDB } from "merkle-patricia-tree/dist/checkpointDb";

export class GanacheTrie extends SecureTrie {
  constructor(db: LevelUp | null, root: Buffer) {
    super(db, root);
  }

  setContext(stateRoot: Buffer, address: Buffer, blockNumber: Quantity) {
    this.root = stateRoot;
  }

  /**
   * Returns a copy of the underlying trie with the interface of GanacheTrie.
   * @param leveldb The underlying db to use for the new trie.
   * @param includeCheckpoints - If true and during a checkpoint, the copy will
   * contain the checkpointing metadata and will use the same scratch as
   * underlying db.
   */
  _copy(leveldb: LevelUp, includeCheckpoints: boolean) {
    const secureTrie = new GanacheTrie(leveldb, this.root);
    if (includeCheckpoints && this.isCheckpoint) {
      secureTrie.db.checkpoints = [...this.db.checkpoints];
    }
    return secureTrie;
  }
  /**
   * Returns a copy of the underlying trie with the interface of GanacheTrie.
   * Uses a by-reference copy of the underlying db for the new trie.
   * @param includeCheckpoints - If true and during a checkpoint, the copy will
   * contain the checkpointing metadata and will use the same scratch as
   * underlying db.
   */
  copy(includeCheckpoints = true) {
    const db = this.db.copy();
    return this._copy(db._leveldb as LevelUp, includeCheckpoints);
  }

  /**
   * Returns a copy of the underlying trie with the interface of GanacheTrie.
   * Uses a by-value in-memory copy of the underlying db for the new trie.
   * @param includeCheckpoints - If true and during a checkpoint, the copy will
   * contain the checkpointing metadata and will use the same scratch as
   * underlying db.
   */
  async deepCopy(includeCheckpoints = true) {
    const db = this.db;
    const dbCopy = new CheckpointDB();
    const stream = db._leveldb.createReadStream({
      keys: true,
      values: true
    });
    for await (const pair of stream) {
      const { key, value } = pair as unknown as { key: Buffer; value: Buffer };
      dbCopy.put(key, value);
    }
    return this._copy(dbCopy._leveldb as LevelUp, includeCheckpoints);
  }
}
