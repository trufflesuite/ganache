import { keccak, Quantity } from "@ganache/utils";
import { Trie } from "@ethereumjs/trie";
import Blockchain from "../blockchain";
import { TrieDB } from "../trie-db";

const keyHashingFunction = (msg: Uint8Array) => {
  return keccak(Buffer.from(msg.buffer, msg.byteOffset, msg.length));
};

export class GanacheTrie extends Trie {
  public readonly blockchain: Blockchain;
  public readonly db: TrieDB;

  constructor(db: TrieDB, root: Buffer, blockchain: Blockchain) {
    super({
      db,
      root,
      useRootPersistence: true,
      useKeyHashing: true,
      useKeyHashingFunction: keyHashingFunction
    });
    this.blockchain = blockchain;
    this.db = db;
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
      this.db.copy(),
      this.root(),
      this.blockchain
    );
    if (includeCheckpoints && this.hasCheckpoints()) {
      secureTrie._db.checkpoints = [...this._db.checkpoints];
    }
    return secureTrie;
  }
}
