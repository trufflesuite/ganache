import type { AbstractLevelDOWN } from "abstract-leveldown";
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
    const sublevel = sub(this.db, prefix, LEVEL_OPTIONS);
    // @ts-ignore
    sublevel.values = sublevel.iterator;
    return sublevel;
  }

  async close() {
    await this.db.close();
  }
}