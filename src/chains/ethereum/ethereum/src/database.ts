import { AbstractSublevel } from "abstract-level";
import Emittery from "emittery";
import { dir, setGracefulCleanup } from "tmp-promise";
import Blockchain from "./blockchain";
import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { Level } from "level";
import { UpgradedLevelDown } from "./leveldown-to-level";

export type GanacheLevel = Level<Buffer, Buffer>;
export type GanacheSublevel = AbstractSublevel<
  GanacheLevel,
  Buffer,
  Buffer,
  Buffer
>;

setGracefulCleanup();
const tmpOptions = { prefix: "ganache_", unsafeCleanup: true };
const noop = () => Promise.resolve();

export enum DBType {
  Level = 0,
  LevelDown = 1
}

export const LEVEL_OPTIONS = {
  keyEncoding: "binary" as const,
  valueEncoding: "binary" as const,
  // specify an empty `prefix` for browser-based leveldown (level-js)
  prefix: "" as const
};
export default class Database extends Emittery {
  public readonly blockchain: Blockchain;
  readonly #options: EthereumInternalOptions["database"];
  // TODO: implement cleanup https://github.com/trufflesuite/ganache/issues/3662
  #cleanupDirectory = noop;
  #closed = false;
  public directory: string = null;
  public db: GanacheLevel;
  public blocks: GanacheSublevel;
  public blockIndexes: GanacheSublevel;
  public blockLogs: GanacheSublevel;
  public transactions: GanacheSublevel;
  public transactionReceipts: GanacheSublevel;
  public storageKeys: GanacheSublevel;
  public trie: GanacheSublevel;
  public readonly initialized: boolean;
  public type: DBType = DBType.Level;

  /**
   * The Database handles the creation of the database, and all access to it.
   * Once the database has been fully initialized it will emit a `ready`
   * event.
   * @param options - Supports one of two options: `db` (a leveldown compliant
   * store instance) or `dbPath` (the path to store/read the db instance)
   * @param blockchain -
   */
  constructor(
    options: EthereumInternalOptions["database"],
    blockchain: Blockchain
  ) {
    super();

    this.#options = options;
    this.blockchain = blockchain;
  }

  initialize = async () => {
    const store = this.#options.db;
    let db: GanacheLevel;
    if (store) {
      if (typeof store === "string") {
        db = <GanacheLevel>new Level(store, LEVEL_OPTIONS);
      } else {
        db = new UpgradedLevelDown(store as any) as unknown as GanacheLevel;
        this.type = DBType.LevelDown;
      }
    } else {
      let directory = this.#options.dbPath;
      if (!directory) {
        const dirInfo = await dir(tmpOptions);
        directory = dirInfo.path;
        this.#cleanupDirectory = dirInfo.cleanup;

        // don't continue if we closed while we were waiting for the dir
        if (this.#closed) return this.#cleanup();
      }
      this.directory = directory;

      const store = <GanacheLevel>new Level(directory, LEVEL_OPTIONS);
      db = store;
    }

    // don't continue if we closed while we were waiting for the db
    if (this.#closed) return this.#cleanup();

    const open = db.open();
    this.trie = <GanacheSublevel>db.sublevel("T", LEVEL_OPTIONS);

    this.db = db;
    await open;

    // don't continue if we closed while we were waiting for it to open
    if (this.#closed) return this.#cleanup();

    this.blocks = <GanacheSublevel>db.sublevel("b", LEVEL_OPTIONS);
    this.blockIndexes = <GanacheSublevel>db.sublevel("i", LEVEL_OPTIONS);
    this.blockLogs = <GanacheSublevel>db.sublevel("l", LEVEL_OPTIONS);
    this.transactions = <GanacheSublevel>db.sublevel("t", LEVEL_OPTIONS);
    this.transactionReceipts = <GanacheSublevel>db.sublevel("r", LEVEL_OPTIONS);
    this.storageKeys = <GanacheSublevel>db.sublevel("s", LEVEL_OPTIONS);
    return this.emit("ready");
  };

  /**
   * Call `batch` to batch `put` and `del` operations within the same
   * event loop tick of the provided function. All db operations within the
   * batch _must_ be executed synchronously.
   * @param fn - Within this function's event loop tick, all `put` and
   * `del` database operations are applied in a single atomic operation. This
   * provides a single write call and if any individual put/del's fail the
   * entire operation fails and no modifications are made.
   * @returns a Promise that resolves to the return value
   * of the provided function.
   */
  public batch<T>(fn: () => T) {
    const rootDb = this.db;
    const batch = rootDb.batch();

    const originalPut = rootDb.put;
    const originalDel = rootDb.del;

    rootDb.put = batch.put.bind(batch) as any;
    rootDb.del = batch.del.bind(batch) as any;
    let prom: Promise<T>;
    try {
      const ret = fn();
      // PSA: don't let vscode (or yourself) rewrite this to `await` the
      // `batch.write` call. The `finally` block needs to run _before_ the
      // write promise has resolved.
      prom = batch.write().then(() => ret);
    } finally {
      rootDb.put = originalPut;
      rootDb.del = originalDel;
    }
    return prom;
  }

  /**
   * Gracefully closes the database and cleans up the file system and waits for
   * it to fully shut down. Emits a `close` event once complete.
   * Note: only emits `close` once.
   */
  public async close() {
    const wasClosed = this.#closed;
    this.#closed = true;
    await this.#cleanup();

    // only emit `close` once
    if (!wasClosed) {
      this.emit("close");
      return;
    }
  }

  /**
   * Cleans up the database connections and our tmp directory.
   */
  #cleanup = async () => {
    const db = this.db;
    if (db) {
      await db.close();
      await Promise.all([
        this.blocks.close(),
        this.blockIndexes.close(),
        this.blockIndexes.close(),
        this.transactionReceipts.close(),
        this.transactions.close(),
        this.storageKeys.close(),
        this.trie.close()
      ]);
    }
    return this.#cleanupDirectory();
  };
}
