import { AbstractLevelDOWN } from "abstract-leveldown";
import Emittery from "emittery";
import { dir, setGracefulCleanup } from "tmp-promise";
import levelup, { LevelUp } from "levelup";
import { FilecoinInternalOptions } from "@ganache/filecoin-options";
const leveldown = require("leveldown");
const sub = require("subleveldown");
const encode = require("encoding-down");

setGracefulCleanup();
const tmpOptions = { prefix: "ganache-core_", unsafeCleanup: true };
const noop = () => Promise.resolve();

export default class Database extends Emittery {
  readonly #options: FilecoinInternalOptions["database"];
  #cleanupDirectory = noop;
  #closed = false;
  public directory: string = null;
  public db: LevelUp = null;
  public tipsets: LevelUp;
  public blocks: LevelUp;
  public readonly initialized: boolean;
  #rootStore: AbstractLevelDOWN;

  /**
   * The Database handles the creation of the database, and all access to it.
   * Once the database has been fully initialized it will emit a `ready`
   * event.
   * @param options Supports one of two options: `db` (a leveldown compliant
   * store instance) or `dbPath` (the path to store/read the db instance)
   * @param blockchain
   */
  constructor(options: FilecoinInternalOptions["database"]) {
    super();

    this.#options = options;
    this.#initialize();
  }

  #initialize = async () => {
    const levelupOptions: any = { valueEncoding: "binary" };
    const store = this.#options.db;
    let db: LevelUp;
    if (store) {
      this.#rootStore = encode(store, levelupOptions);
      db = levelup(this.#rootStore, {});
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

      // specify an empty `prefix` for browser-based leveldown (level-js)
      const leveldownOpts = { prefix: "" };
      const store = encode(leveldown(directory, leveldownOpts), levelupOptions);
      this.#rootStore = store;
      db = levelup(store, {});
    }

    // don't continue if we closed while we were waiting for the db
    if (this.#closed) return this.#cleanup();

    const open = db.open();

    this.db = db;
    await open;

    // don't continue if we closed while we were waiting for it to open
    if (this.#closed) return this.#cleanup();

    this.tipsets = sub(db, "t", levelupOptions);
    this.blocks = sub(db, "b", levelupOptions);

    return this.emit("ready");
  };

  /**
   * Call `batch` to batch `put` and `del` operations within the same
   * event loop tick of the provided function. All db operations within the
   * batch _must_ be executed synchronously.
   * @param fn Within this function's event loop tick, all `put` and
   * `del` database operations are applied in a single atomic operation. This
   * provides a single write call and if any individual put/del's fail the
   * entire operation fails and no modifications are made.
   * @returns a Promise that resolves to the return value
   * of the provided function.
   */
  public batch<T>(fn: () => T) {
    const rootDb = this.#rootStore.db;
    const batch = this.db.batch();

    const originalPut = rootDb.put;
    const originalDel = rootDb.del;

    rootDb.put = batch.put.bind(batch);
    rootDb.del = batch.del.bind(batch);
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
      await new Promise((resolve, reject) =>
        db.close(err => {
          if (err) return void reject(err);
          resolve(void 0);
        })
      );
      await Promise.all([this.tipsets.close()]);
    }
    return this.#cleanupDirectory();
  };
}
