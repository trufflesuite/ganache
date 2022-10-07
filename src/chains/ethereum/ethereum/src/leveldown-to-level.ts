import type {
  AbstractLevelDOWN,
  AbstractIteratorOptions
} from "abstract-leveldown";
import type { BatchDBOp } from "@ethereumjs/trie";
import sub from "subleveldown";
import type { LevelUp } from "levelup";
import { LEVEL_OPTIONS } from "./database";
const levelup = require("levelup");

export type GanacheLevelDown = AbstractLevelDOWN<Buffer, Buffer>;
export class UpgradedLevelDown {
  public db: LevelUp<GanacheLevelDown> = null;
  #rootStore: GanacheLevelDown;

  constructor(store: GanacheLevelDown) {
    this.#rootStore = store;
    this.db = levelup(store, LEVEL_OPTIONS);
  }

  async open(): Promise<void> {
    await this.db.open();
  }

  async get(key: Buffer): Promise<Buffer | null> {
    let val = null;
    try {
      val = await this.db.get(key);
    } catch (error: any) {
      if (!error.notFound) {
        throw error;
      }
    }
    return val;
  }

  async put(key: Buffer, val: Buffer): Promise<void> {
    await this.db.put(key, val);
  }

  async del(key: Buffer): Promise<void> {
    await this.db.del(key);
  }

  batch(opStack: BatchDBOp[]) {
    if (opStack) return this.db.batch(opStack) as any;
    else return this.db.batch() as any;
  }

  copy(): UpgradedLevelDown {
    return new UpgradedLevelDown(this.#rootStore);
  }

  sublevel(prefix: string) {
    // if we were to go all-out on this function, we'd have it return a
    // GanacheSublevel. However, that would require another file similar to this
    // one "sub-to-sublevel", which just doesn't seem quite worth it since
    // the only different function we actually use is `values`. so this will
    // suffice for now. Eventually we'll break Ganache to use `level` only and
    // we can remove this whole file.
    const sublevel = sub(this.db, prefix, LEVEL_OPTIONS);
    // @ts-ignore
    sublevel.values = (options: AbstractIteratorOptions) => {
      return sublevel.iterator({ ...options, values: true });
    };
    return sublevel;
  }

  async close() {
    await this.db.close();
  }
}
