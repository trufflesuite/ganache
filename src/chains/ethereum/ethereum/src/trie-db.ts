import { MemoryLevel } from "memory-level";

import type { BatchDBOp, DB } from "@ethereumjs/trie";
import { GanacheLevelUp } from "./database";

const ENCODING_OPTS = { keyEncoding: "binary", valueEncoding: "binary" };

export class TrieDB implements DB {
  readonly _db: GanacheLevelUp;

  constructor(db?: GanacheLevelUp) {
    this._db = db;
  }

  async get(key: Buffer): Promise<Buffer | null> {
    let value = null;
    try {
      value = await this._db.get(key, ENCODING_OPTS);
    } catch (error: any) {
      if (error.notFound) {
        // not found, returning null
      } else {
        throw error;
      }
    }
    return value as Buffer;
  }

  async put(key: Buffer, val: Buffer): Promise<void> {
    await this._db.put(key, val, ENCODING_OPTS);
  }

  async del(key: Buffer): Promise<void> {
    await this._db.del(key, ENCODING_OPTS);
  }

  async batch(opStack: BatchDBOp[]): Promise<void> {
    await this._db.batch(opStack, ENCODING_OPTS);
  }

  copy(): TrieDB {
    return new TrieDB(this._db);
  }
  }
}
