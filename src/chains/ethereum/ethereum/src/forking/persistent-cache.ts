import { mkdir } from "fs/promises";
import envPaths from "env-paths";
import levelup from "levelup";
import type { LevelUp } from "levelup";
import leveldown from "leveldown";
import sub from "subleveldown";
import encode from "encoding-down";

let counter = 0;
let singletonDb: LevelUp;

const levelupOptions: any = {
  keyEncoding: "binary",
  valueEncoding: "binary"
};
const leveldownOpts = { prefix: "" };

export class PersistentCache {
  public db: LevelUp;
  public chainDb: LevelUp;
  constructor() {}

  static async create() {
    const cache = new PersistentCache();
    if (singletonDb) {
      counter++;
      cache.db = singletonDb;
    } else {
      const { data: directory } = envPaths("Ganache/db", { suffix: "" });
      await mkdir(directory, { recursive: true });

      const store = encode(leveldown(directory, leveldownOpts), levelupOptions);
      cache.db = levelup(store);
      await cache.db.open();
      singletonDb = cache.db;
    }

    return cache;
  }
  async init(
    chainId: number,
    networkId: number,
    hash: string,
    _request: <T = unknown>(method: string, params: any[]) => Promise<T>
  ) {
    // naive id: chainId + networkID + hash block
    // todo: create the db key via @truffle/db smarts!
    const key = `${chainId}:${networkId}:${hash}`;
    this.chainDb = sub(this.db, key);
    await this.chainDb.open();
  }

  get(key: string) {
    return this.chainDb.get(key);
  }
  put(key: string, value: Buffer) {
    return this.chainDb.put(key, value);
  }
  async close() {
    if (this.chainDb) {
      await this.chainDb.close();
    }
    if (this.db) {
      counter--;
      if (counter === 0) {
        await this.db.close();
        singletonDb = null;
      }
    }
  }
}
