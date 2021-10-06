import { AbstractIteratorOptions, AbstractLevelDOWN } from "abstract-leveldown";
import type { LevelUp as LevelUpType } from "levelup";

export class LevelWait<DB extends AbstractLevelDOWN = AbstractLevelDOWN> {
  public readonly db: LevelUpType;
  public readonly rootDb: LevelWait<DB>;

  constructor(db: LevelUpType, rootDb?: LevelWait<DB>) {
    this.db = db;
    this.rootDb = rootDb;
  }

  private openCount = 0;

  async *withDb() {
    const self = this;
    const withOwn = async function* () {
      try {
        try {
          if (self.openCount === 0) await self.db.open();
        } catch (e) {
          // failed to open, try again in a moment
          await new Promise(resolve => setTimeout(resolve, 10));
          yield* withOwn();
          return;
        }
        self.openCount++;
        yield self.db;
      } finally {
        self.openCount--;
        if (self.openCount === 0) await self.db.close();
      }
    };
    // ensure the outer db is opened first
    if (this.rootDb) {
      for await (const _ of this.rootDb.withDb()) {
        yield* withOwn();
      }
    } else {
      yield* withOwn();
    }
  }

  get: LevelUpType<DB>["get"] = (async (...args: any) => {
    for await (const db of this.withDb()) {
      return await db.get.apply(db, args);
    }
  }) as any;

  put: LevelUpType<DB>["put"] = (async (...args: any) => {
    for await (const db of this.withDb()) return await db.put.apply(db, args);
  }) as any;

  batch: LevelUpType<DB>["batch"] = ((...args: any) => {
    const batch = this.db.batch.apply(this.db, args) as any;
    const write = batch.write;
    batch.write = async (...args: any) => {
      for await (const _ of this.withDb()) {
        return await write.apply(batch, args);
      }
    };
    return batch;
  }) as any;

  del: LevelUpType<DB>["del"] = (async (...args: any) => {
    for await (const db of this.withDb()) {
      return await db.del.apply(this, args);
    }
  }) as any;

  async *createReadStream(options?: AbstractIteratorOptions) {
    for await (const db of this.withDb()) {
      yield* db.createReadStream(options) as {
        [Symbol.asyncIterator](): AsyncIterableIterator<
          Buffer | { key: Buffer; value: Buffer }
        >;
      };
    }
  }

  async close() {
    return await this.db.close();
  }
}
