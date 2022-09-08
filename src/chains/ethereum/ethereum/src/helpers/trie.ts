import { Quantity } from "@ganache/utils";
import { DB, Trie } from "@ethereumjs/trie";
import Blockchain from "../blockchain";

export class GanacheTrie extends Trie {
  public readonly blockchain: Blockchain;

  constructor(db: DB | null, root: Buffer, blockchain: Blockchain) {
    super({ db, root, useRootPersistence: true, useKeyHashing: true });
    this.blockchain = blockchain;
  }

  setContext(stateRoot: Buffer, address: Buffer, blockNumber: Quantity) {
    this.root(stateRoot);
  }

  /**
   * Returns a copy of the underlying trie with the interface of GanacheTrie.
   * @param includeCheckpoints - If true and during a checkpoint, the copy will contain the checkpointing metadata and will use the same scratch as underlying db.
   */
  copy(includeCheckpoints: boolean = true) {
    const secureTrie = new GanacheTrie(
      this._db.copy().db,
      this.root(),
      this.blockchain
    );
    if (includeCheckpoints && this.hasCheckpoints()) {
      secureTrie._db.checkpoints = [...this._db.checkpoints];
    }
    return secureTrie;
  }
}
