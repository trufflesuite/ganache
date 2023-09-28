import type { BatchDBOp, DB } from "@ethereumjs/util";
import sub from "subleveldown";
import type { AbstractIteratorOptions } from "abstract-level";
import { GanacheLevelUp } from "./database";

const ENCODING_OPTS = { keyEncoding: "binary", valueEncoding: "binary" };

/**
 * `@ethereumjs/trie` requires that any database passed to it implements a `DB`.
 * The `DB` interface defines the minimum set of database access methods that
 * ethereumjs needs internally. We implement that interface in `TrieDB`, as well
 * as a few other methods that we use in Ganache internally.
 */
export class TrieDB implements DB<string, string> {
  readonly _db: GanacheLevelUp;

  constructor(db: GanacheLevelUp) {
    this._db = db;
  }

  async get(key: string): Promise<string | null> {
    let value = undefined;
    try {
      value = await this._db.get(Buffer.from(key, "hex"), ENCODING_OPTS);
    } catch (error: any) {
      if (error.notFound) {
        // not found, returning undefined
      } else {
        throw error;
      }
    }
    return value ? value.toString("hex") : undefined;
  }

  async put(key: string, val: string): Promise<void> {
    await this._db.put(
      Buffer.from(key, "hex"),
      Buffer.from(val, "hex"),
      ENCODING_OPTS
    );
  }

  async del(key: string): Promise<void> {
    await this._db.del(Buffer.from(key, "hex"), ENCODING_OPTS);
  }

  async batch(opStack: BatchDBOp<string, string>[]): Promise<void> {
    await this._db.batch(
      opStack.map(ops => {
        switch (ops.type) {
          case "put":
            return {
              type: "put",
              key: Buffer.from(ops.key, "hex"),
              value: Buffer.from(ops.value, "hex")
            };
          case "del":
            return {
              type: "del",
              key: Buffer.from(ops.key, "hex")
            };
        }
      }),
      ENCODING_OPTS
    );
  }

  shallowCopy(): TrieDB {
    return new TrieDB(this._db);
  }

  async open() {}

  async close() {
    await this._db.close();
  }

  sublevel(prefix: string, options: object): GanacheLevelUp {
    return sub(this._db, prefix, options);
  }

  createReadStream(options?: AbstractIteratorOptions<Buffer, Buffer>) {
    return this._db.createReadStream(options);
  }
}
