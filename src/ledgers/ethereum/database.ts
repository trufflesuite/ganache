import Emittery from "emittery";
import { dir, setGracefulCleanup } from "tmp-promise";
import levelup from "levelup";
import Blockchain from "./blockchain";
const leveldown = require("leveldown");
const sub = require("subleveldown");
const encode = require("encoding-down");

type DatabaseOptions = {db?: string | object, db_path?: string};

setGracefulCleanup();
const tmpOptions = {prefix: "ganache-core_", unsafeCleanup: true};
const noop = (callback: () => void): void => callback();

export default class Database extends Emittery {
  public readonly blockchain: Blockchain;
  private readonly options: DatabaseOptions;
  private _cleanupDirectory = noop;
  private closed = false;
  public directory: string = null;
  public db: levelup.LevelUp = null;
  public blocks: levelup.LevelUp;
  public blockLogs: levelup.LevelUp;
  public blockHashes: levelup.LevelUp;
  public transactions: levelup.LevelUp;
  public transactionReceipts: levelup.LevelUp;
  public trie: levelup.LevelUp;
  public readonly initialized: boolean;

  /**
   * The Database handles the creation of the database, and all access to it.
   * Once the database has been fully initialized it will emit a `ready`
   * event.
   * @param options Supports one of two options: `db` (a leveldown compliant
   * store instance) or `db_path` (the path to store/read the db instance)
   * @param blockchain 
   */
  constructor(options: DatabaseOptions, blockchain: Blockchain) {
    super();

    this.options = options;
    this.blockchain = blockchain;
    this._initialize();
  }
  
  private async _initialize() {
    const levelupOptions: any = { valueEncoding: "binary" };
    const store = this.options.db;
    let db;
    if (store) {
      db = await levelup(store as any, levelupOptions);
    } else {
      let directory = this.options.db_path;
      if (!directory) {
        const dirInfo = await dir(tmpOptions);
        directory = dirInfo.path;
        this._cleanupDirectory = dirInfo.cleanup;

        // don't continue if we closed while we were waiting for the dir
        if (this.closed) return this._cleanup();
      }
      this.directory = directory;
      const store = encode(leveldown(directory), levelupOptions);
      db = await levelup(store, {});
    }

    // don't continue if we closed while we were waiting for the db
    if (this.closed) return this._cleanup();

    const open = db.open();
    this.trie = sub(db, "trie", levelupOptions);

    this.db = db;
    await open;

    // don't continue if we closed while we were waiting for it to open
    if (this.closed) return this._cleanup();
    
    this.blocks = sub(db, "blocks", levelupOptions);
    this.transactions = sub(db, "transactions", levelupOptions);

    await this.emit("ready");
    return;
  }

  /**
   * Gracefully closes the database and cleans up the file system and waits for
   * it to fully shut down. Emits a `close` event once complete.
   * Note: only emits `close` once.
   */
  public async close() {
    const wasClosed = this.closed;
    this.closed = true;
    await this._cleanup();

    // only emit `close` once
    if (!wasClosed) {
      this.emit("close");
      return;
    }
  }

  /**
   * Cleans up the database connections and our tmp directory.
   */
  private async _cleanup(){
    const db = this.db;
    if (db) {
      await db.close();
      await Promise.all(
        [
          this.blocks.close(),
          this.transactions.close(),
          this.trie.close()
        ]
      );
    }
    return new Promise(resolve => this._cleanupDirectory(resolve));
  }
}
