import { AbstractIteratorOptions, AbstractLevelDOWN } from "abstract-leveldown";
import type { LevelUp as LevelUpType } from "levelup";

export class LevelWait<DB extends AbstractLevelDOWN = AbstractLevelDOWN> {
  public readonly db: LevelUpType;
  public readonly rootDb: LevelWait<DB>;

  constructor(db: LevelUpType, rootDb?: LevelWait<DB>) {
    this.db = db;
    this.rootDb = rootDb;
  }

  async withDb(callback: any) {
    if (this.rootDb) {
      return this.rootDb.withDb(async () => {
        retry: while (true) {
          try {
            console.log("root open db");
            await this.db.open();
            console.log("root db opened");
            break;
          } catch (e) {
            console.log(e);
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log("root try again");
            continue retry;
          }
        }
        try {
          console.log("root: return await callback(this.db);");
          return await callback(this.db);
        } finally {
          console.log("root await this.db.close();");
          await this.db.close();
          console.log("ROOT CLOSED");
        }
      });
    } else {
      retry: while (true) {
        try {
          console.log("open db");
          await this.db.open();
          console.log("db opened");
          break;
        } catch (e) {
          console.log(e);
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log("try again");
          continue retry;
        }
      }
      try {
        console.log("return await callback(this.db);");
        return await callback(this.db);
      } finally {
        console.log("await this.db.close();");
        await this.db.close();
        console.log("CLOSED");
      }
    }
  }

  get: LevelUpType<DB>["get"] = (async (...args: any) => {
    return await this.withDb(async db => {
      return await db.get.apply(db, args);
    });
  }) as any;

  put: LevelUpType<DB>["put"] = (async (...args: any) => {
    return await this.withDb(async db => {
      return await db.put.apply(db, args);
    });
  }) as any;

  batch: LevelUpType<DB>["batch"] = ((...args: any) => {
    const batch = this.db.batch.apply(this.db, args) as any;
    const write = batch.write;
    batch.write = async (...args: any) => {
      return await this.withDb(async db => {
        return await write.apply(batch, args);
      });
    };
    return batch;
  }) as any;

  del: LevelUpType<DB>["del"] = (async (...args: any) => {
    return await this.withDb(async db => {
      return await db.del.apply(db, args);
    });
  }) as any;

  async *createReadStream(options?: AbstractIteratorOptions) {
    if (this.rootDb) {
      openRoot: while (true) {
        try {
          await this.rootDb.db.open();
          break;
        } catch (e) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue openRoot;
        }
      }
    }
    openSelf: while (true) {
      try {
        await this.db.open();
        break;
      } catch (e) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue openSelf;
      }
    }
    try {
      yield* this.db.createReadStream(options) as {
        [Symbol.asyncIterator](): AsyncIterableIterator<
          Buffer | { key: Buffer; value: Buffer }
        >;
      };
    } finally {
      // TODO: this doesn't work. the caller has to make sure that close is called! :-()
      await this.db.close();
      await this.rootDb.close();
    }
  }

  async close() {
    return await this.db.close();
  }
}
