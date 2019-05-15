import Emittery from "emittery";
import { dir } from "tmp-promise";
import levelup from "levelup";
import Blockchain from "./blockchain";
const leveldown = require("leveldown");
const sub = require( "subleveldown");
const encode = require("encoding-down");

type DatabaseOptions = {db?: string | object, dbPath?: string};


const tmpOptions = {prefix: "ganache-core_", unsafeCleanup: true};
const noop = (): void => {};

export default class Database extends Emittery{
  public readonly blockchain: Blockchain;
  private readonly options: DatabaseOptions;
  private _cleanup = noop;
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
   * Emit's a `close` event once complete.
   * @param options Supports one of two options: `db` (a leveldown compliant
   * store instance) or `dbPath` (the path to store/read the db instance)
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
      let directory = this.options.dbPath;
      if (!directory) {
        const dirInfo = await dir(tmpOptions);
        directory = dirInfo.path;
        this._cleanup = dirInfo.cleanup;

        // don't continue if we closed while we were waiting for the dir
        if (this.closed) return this.cleanup();
      }
      this.directory = directory;
      const store = encode(leveldown(directory), levelupOptions);
      db = await levelup(store, {});
    }

    // don't continue if we closed while we were waiting for the db
    if (this.closed) return this.cleanup();

    const open = db.open();
    this.trie = sub(db, "trie", levelupOptions);

    this.db = db;
    await open;

    // don't continue if we closed while we were waiting for it to open
    if (this.closed) return this.cleanup();
    
    this.blocks = sub(db, "blocks", levelupOptions);
    this.transactions = sub(db, "transactions", levelupOptions);

    this.emit("ready");
    return;
  }
  /**
   * Gracefully close the database and wait for it to fully shut down.
   * Emit's a `close` event once complete.
   */
  public async close() {
    const wasClosed = this.closed;
    this.closed = true;
    await this.cleanup();

    // only emit `close` once
    if (!wasClosed) {
      this.emit("close");
      return;
    }
  }
  private async cleanup(){
    // const db = this.db;
    // if (db && db.isOpen()) {
    //    await db.close();
    // }
    // this._cleanup();
  }
}
