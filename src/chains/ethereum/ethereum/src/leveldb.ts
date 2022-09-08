import { MemoryLevel } from "memory-level";

import type { BatchDBOp, DB } from "@ethereumjs/trie";
import type { AbstractLevel } from "abstract-level";

const ENCODING_OPTS = { keyEncoding: "buffer", valueEncoding: "buffer" };

export class LevelDB implements DB {
  readonly _leveldb: AbstractLevel<
    string | Buffer | Uint8Array,
    string | Buffer,
    string | Buffer
  >;

  constructor(
    leveldb?: AbstractLevel<
      string | Buffer | Uint8Array,
      string | Buffer,
      string | Buffer
    > | null
  ) {
    this._leveldb = leveldb ?? new MemoryLevel(ENCODING_OPTS);
  }

  async get(key: Buffer): Promise<Buffer | null> {
    let value = null;
    try {
      value = await this._leveldb.get(key, ENCODING_OPTS);
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
    await this._leveldb.put(key, val, ENCODING_OPTS);
  }

  async del(key: Buffer): Promise<void> {
    await this._leveldb.del(key, ENCODING_OPTS);
  }

  async batch(opStack: BatchDBOp[]): Promise<void> {
    await this._leveldb.batch(opStack, ENCODING_OPTS);
  }

  copy(): DB {
    return new LevelDB(this._leveldb);
  }
}
