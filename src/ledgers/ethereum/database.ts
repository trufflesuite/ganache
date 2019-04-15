import Emittery from "emittery";
const sub = require( "subleveldown");
import { dir } from "tmp-promise";
const leveldown = require("leveldown");
import levelup from "levelup";
const encode = require("encoding-down");
const cachedown = require("cachedown");

async function getDir(db_path: string) {
    if (db_path) {
      return db_path;
    } else {
      await dir();
    }
  }

export default class Database extends Emittery{
    private options: any;
    public directory: string = null;
    private _db: levelup.LevelUp = null;
    public blocks: levelup.LevelUp;
    public blockLogs: levelup.LevelUp;
    public blockHashes: levelup.LevelUp;
    public transactions: levelup.LevelUp;
    public transactionReceipts: levelup.LevelUp;
    public stateTrie: levelup.LevelUp;
    public initialized: boolean;
    constructor(options: any) {
        super();

        this.options = options;
        this._initialize();
    }
    private async _initialize(){
        const levelupOptions: any = { valueEncoding: "binary" };
        // delete levelupOptions.valueEncoding;
        const store = this.options.db;
        let db;
        if (store) {
            db = await levelup(store, levelupOptions);
        } else {
            let directory = this.options.db_path;
            if (!directory) {
                directory = (await dir()).path;
            }
            this.directory = directory;
            const store = encode(leveldown(directory), levelupOptions);
            db = await levelup(store, {});
        }

        const open = db.open();
        const self = this;

        // Blocks, keyed by array index (not necessarily by block number) (0-based)
        self.blocks = sub(db, "blocks", levelupOptions);

        // Logs triggered in each block, keyed by block id (ids in the blocks array; not necessarily block number) (0-based)
        self.blockLogs = sub(db, "blockLogs", levelupOptions);

        // Block hashes -> block ids (ids in the blocks array; not necessarily block number) for quick lookup
        self.blockHashes = sub(db, "blockHashes", levelupOptions);

        // Transaction hash -> transaction objects
        self.transactions = sub(db, "transactions", levelupOptions);

        // Transaction hash -> transaction receipts
        self.transactionReceipts = sub(db, "transactionReceipts", levelupOptions);

        self.stateTrie = sub(db, "stateTrie", levelupOptions);

        this._db = db;
        await open;
        this.emit("ready");
    }
    public async close() {
        const db = this._db;
        if (db && db.isOpen()) {
            db.close();
        }
    }
}